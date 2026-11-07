import React, { useEffect, useReducer, useRef, useState } from "react"
import ProfilePic from "./ProfilePic"
import SubmitButton from "./Button"
import { Box, Modal, Switch } from "@mui/material"
import Input from "./Input"
import LocationSelector from "./LocationSelector"
import { validateAuthInput } from "../utils/authValidation"
import { useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import useUsers from "../hooks/useUsers"
import { BASE_URL, SMALL_SCREEN_SIZE } from "../utils/config"
import {
    changePasswordFormReducer,
    initializeSettingsForm,
    settingsFormReducer,
} from "../utils/reducer"
import { useDispatch, useSelector } from "react-redux"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { updateUserData } from "../store/authSlice"
import usePendingMutations from "../hooks/usePendingMutations"
import { produce } from "immer"
import { useMediaQuery } from "react-responsive"
import { IoSettingsOutline } from "react-icons/io5"
import Spinner from "./Spinner"
import { useInView } from "react-intersection-observer"
const MODAL_TYPES = {
    DETAILS: "DETAILS",
    PASSWORD: "PASSWORD",
    EMAIL: "EMAIL",
    BLOCKS: "BLOCKS",
}

// Utility: safely extract a readable string from an Axios/error object
const extractErrorMessage = (err) => {
    if (!err) return null
    // axios style
    const resp = err.response?.data
    if (typeof resp === "string") return resp
    // sometimes server returns an object like { message: '...', error: '...' }
    if (resp && typeof resp === "object") {
        return resp.message || resp.error || JSON.stringify(resp)
    }
    // fallback to top-level message
    return err.message || String(err)
}

const SettingsModal = ({ trigger = null }) => {
    const [modalType, setModalType] = useState(null)
    const { useProfileQuery } = useUsers()
    const username = useSelector((state) => state.auth.userData?.username)
    const { data: profileInfo, isFetching: isFetchingProfile } = useProfileQuery(username, true)
    const isMobile = useMediaQuery({ maxWidth: SMALL_SCREEN_SIZE })

    const openModal = (type) => setModalType(type)
    const closeModal = () => setModalType(null)

    const handleOpenDetails = () => openModal(MODAL_TYPES.DETAILS)

    return (
        <>
            {trigger ? (
                // clone provided trigger element and attach onClick to open details
                React.cloneElement(trigger, { onClick: handleOpenDetails })
            ) : (
                <IoSettingsOutline
                    size={22}
                    style={{ marginTop: 12 }}
                    onClick={handleOpenDetails}
                />
            )}

            <Modal
                open={!!modalType}
                onClose={closeModal}
            >
                <Box sx={getModalWrapperStyles(isMobile)}>
                    <Box sx={getModalContainerStyles(isMobile)}>
                        {modalType === MODAL_TYPES.DETAILS && (
                            <>
                                <ProfileDetailsForm
                                    profileInfo={profileInfo}
                                    openModal={openModal}
                                />
                            </>
                        )}

                        {modalType === MODAL_TYPES.PASSWORD && (
                            <ChangePasswordForm profileInfo={profileInfo} />
                        )}

                        {modalType === MODAL_TYPES.EMAIL && (
                            <ChangeEmailForm profileInfo={profileInfo} />
                        )}

                        {modalType === MODAL_TYPES.BLOCKS && (
                            <BlockedUsersForm profileInfo={profileInfo} />
                        )}
                    </Box>
                </Box>
            </Modal>
        </>
    )
}

const ProfileDetailsForm = ({ profileInfo, openModal }) => {
    const [form, dispatch] = useReducer(settingsFormReducer, profileInfo, initializeSettingsForm)
    const { useUpdateProfile } = useUsers()
    const updateProfilePicMutation = useUpdateProfile(profileInfo.username, ["update-profile-pic"])
    const updateDetailsMutation = useUpdateProfile(profileInfo.username, ["update-details"])
    const queryClient = useQueryClient()

    const hasFormChanges = Object.keys(form).some((key) => {
        if (key === "interests") {
            return JSON.stringify(form[key].value) !== JSON.stringify(profileInfo?.interests || [])
        }
        return form[key].value !== (profileInfo[key] ?? "")
    })

    const isFormInvalid = Object.values(form).some(({ error }) => !!error)
    const { isPendingMutations: isMutating } = usePendingMutations(["update-details"])

    const CATEGORIES = [
        { id: "Fitness", title: "Fitness", icon: "💪" },
        { id: "Money", title: "Money", icon: "💼" },
        { id: "Self-Improvement", title: "Self-Improvement", icon: "🎯" },
    ]

    useEffect(() => {
        console.log(form)
    }, [form])

    const handleInterestToggle = (interest) => {
        const currentInterests = form.interests.value || []
        const newInterests = currentInterests.includes(interest)
            ? currentInterests.filter((i) => i !== interest)
            : currentInterests.length < 5
            ? [...currentInterests, interest]
            : currentInterests

        console.log("called: " + newInterests)

        dispatch({
            type: "UPDATE",
            payload: {
                field: "interests",
                value: newInterests,
                error: null,
            },
        })
    }

    const handleInputChange = (inputId, value) => {
        const validationResult = validateAuthInput(inputId, value)
        const error = validationResult?.[inputId]?.[0]
        dispatch({ type: "UPDATE", payload: { field: inputId, value, error } })
    }

    const retrieveUpdatedFields = () => {
        const payload = {}
        for (const key of Object.keys(form)) {
            const v = form[key].value
            const originalV = key === "interests" ? profileInfo[key] || [] : profileInfo[key] ?? ""

            if (JSON.stringify(v) !== JSON.stringify(originalV)) {
                payload[key] = v
            }
        }

        return payload
    }

    const handleFieldsUpdate = (e) => {
        e.preventDefault()

        const updatedFields = retrieveUpdatedFields()

        console.log(updatedFields)

        updateDetailsMutation.mutate({ ...updatedFields })
    }

    return (
        <>
            <Box sx={{ width: "100%", height: "100%" }}>
                <h4 style={styles.headerTitle}>Settings</h4>
                <form style={styles.form}>
                    <div style={{ alignSelf: "center" }}>
                        <ProfilePic
                            hasEdit={true}
                            size={56}
                            src={
                                profileInfo.profilePic &&
                                `${BASE_URL}/uploads/profilePics/${profileInfo.profilePic}`
                            }
                            isLoading={updateProfilePicMutation.isPending}
                            onChange={(file) => {
                                updateProfilePicMutation.mutate({ file })
                            }}
                        />
                    </div>

                    <div style={styles.linkRow}>
                        <button
                            style={styles.link}
                            onClick={() => openModal(MODAL_TYPES.PASSWORD)}
                        >
                            Change Password
                        </button>
                        <button
                            style={styles.link}
                            onClick={() => openModal(MODAL_TYPES.EMAIL)}
                        >
                            Change Email
                        </button>
                        <button
                            style={styles.link}
                            onClick={() => openModal(MODAL_TYPES.BLOCKS)}
                        >
                            Blocked Users
                        </button>
                    </div>

                    <div style={styles.inputSection}>
                        <label style={styles.inputLabel}>Location</label>
                        <LocationSelector
                            style={{ width: "100%" }}
                            onSelect={(location) => handleInputChange("location", location)}
                            initialValue={form.location?.value || ""}
                        />
                        {form.location?.error && (
                            <span style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
                                {form.location.error}
                            </span>
                        )}
                    </div>

                    <div style={styles.inputSection}>
                        <label style={styles.inputLabel}>Interests</label>
                        <div style={styles.interestsContainer}>
                            {CATEGORIES.map((category) => (
                                <div
                                    key={category.id}
                                    style={{
                                        ...styles.interestItem,
                                        backgroundColor: (form.interests.value || []).includes(
                                            category.id
                                        )
                                            ? "#007AFF"
                                            : "rgba(255, 255, 255, 0.05)",
                                        color: (form.interests.value || []).includes(category.id)
                                            ? "white"
                                            : "#fff",
                                        cursor:
                                            (form.interests.value || []).includes(category.id) ||
                                            (form.interests.value || []).length < 5
                                                ? "pointer"
                                                : "not-allowed",
                                    }}
                                    onClick={() => handleInterestToggle(category.id)}
                                >
                                    <span style={styles.categoryIcon}>{category.icon}</span>
                                    {category.title}
                                </div>
                            ))}
                        </div>
                        {(form.interests.value || []).length === 5 && (
                            <span style={styles.interestsLimit}>Maximum 5 interests selected</span>
                        )}
                    </div>

                    <div style={styles.inputSection}>
                        <label style={styles.inputLabel}>Username</label>
                        <Input
                            value={form.username.value}
                            error={form.username.error}
                            placeholder='Enter your username'
                            style={styles.fullWidth}
                            onChange={(e) => handleInputChange("username", e.target.value)}
                        />
                    </div>

                    <div style={styles.inputSection}>
                        <label style={styles.inputLabel}>Bio</label>
                        <Input
                            value={form.bio.value}
                            error={form.bio.error}
                            placeholder='Tell people about yourself'
                            style={styles.fullWidth}
                            onChange={(e) => handleInputChange("bio", e.target.value)}
                        />
                    </div>
                    <SubmitButton
                        type='submit'
                        title='Done'
                        style={{
                            ...styles.fullWidth,
                            backgroundColor:
                                !hasFormChanges || isFormInvalid || isMutating ? "#333" : "#007AFF",
                            cursor:
                                !hasFormChanges || isFormInvalid || isMutating
                                    ? "not-allowed"
                                    : "pointer",
                            opacity: !hasFormChanges || isFormInvalid || isMutating ? 0.5 : 1,
                        }}
                        onClick={handleFieldsUpdate}
                        isDisabled={!hasFormChanges || isFormInvalid || isMutating}
                    >
                        Save Changes
                    </SubmitButton>
                </form>
            </Box>
        </>
    )
}

const ChangeEmailForm = ({ profileInfo }) => {
    const isMobile = useMediaQuery({ maxWidth: SMALL_SCREEN_SIZE })
    const email = useSelector((state) => state.auth.userData?.email)
    const DEFAULT_EMAIL_STATE = { value: email, error: null }
    const dispatch = useDispatch()
    const axiosPrivate = useAxiosPrivate()
    const queryClient = useQueryClient()
    const [step, setStep] = useState(1)
    const [emailState, setEmailState] = useState(DEFAULT_EMAIL_STATE)
    const [requestError, setRequestError] = useState(null)
    const [verifyError, setVerifyError] = useState(null)
    const [verifySuccess, setVerifySuccess] = useState(false)
    const codeRef = useRef("")
    const { isPendingMutations: isMutating } = usePendingMutations(["change-email"])

    const requestEmailChangeMutation = useMutation({
        mutationKey: ["change-email", "request"],
        mutationFn: (data) => {
            const { emailValue } = data
            return axiosPrivate
                .post(`${BASE_URL}/api/users/request-email-change`, {
                    email: emailValue,
                })
                .then((res) => res.data)
        },
        onError: (err) => {
            const apiMessage = extractErrorMessage(err)
            setRequestError(apiMessage)
        },
        onSuccess: () => {
            setRequestError(null)
            setStep(2)
        },
    })

    useEffect(() => {
        setEmailState({ value: email, error: null })
    }, [email])

    useEffect(() => {
        console.log(requestError)
    }, [requestError])

    const verifyEmailMutation = useMutation({
        mutationKey: ["change-email", "verify"],
        mutationFn: (data) => {
            const { code } = data
            return axiosPrivate
                .post(`${BASE_URL}/api/users/confirm-email-change`, {
                    token: code,
                })
                .then((res) => res.data)
        },
        onSuccess: (data) => {
            setVerifyError(null)
            setVerifySuccess(true)
            dispatch(updateUserData({ property: "email", value: data.email }))
        },
        onError: (err) => {
            const apiMessage = extractErrorMessage(err) || "Verification failed"
            setVerifyError(apiMessage)
        },
        // onSettled: () => {
        //     queryClient.invalidateQueries(["profile", profileInfo.username])
        // },
    })

    const handleInputChange = (value) => {
        const validationResult = validateAuthInput("email", value)
        const error = validationResult?.["email"]?.[0]
        setEmailState({ value, error })
    }

    const resetState = () => {
        setEmailState(DEFAULT_EMAIL_STATE)
        setRequestError(null)
        setVerifyError(null)
        setVerifySuccess(false)
        setStep(1)
    }

    useEffect(() => {
        resetState()
    }, [profileInfo])

    useEffect(() => {
        console.log(verifyEmailMutation.isPending)
    }, [verifyEmailMutation.isPending])

    // slightly reduce vertical gap for Change Email form so input and button sit closer
    // and use a tighter input section spacing for this form
    const localFormStyle = { ...styles.form, gap: "4px", marginTop: "24px" }
    const localInputSection = { ...styles.inputSection, gap: 6, marginTop: 6 }

    // validation states for buttons
    const isEmailEmpty = !emailState.value || emailState.value.trim() === ""
    const isRequestDisabled =
        isMutating ||
        requestEmailChangeMutation.isPending ||
        !!emailState.error ||
        emailState.value === email ||
        isEmailEmpty

    const codeValue = codeRef.current?.value || ""
    const isVerifyDisabled =
        verifySuccess || isMutating || verifyEmailMutation.isPending || !codeValue.trim()

    return (
        <>
            <Box sx={{ width: "100%", height: isMobile ? "100%" : "60vh", overflowY: "auto" }}>
                {step === 1 && (
                    <>
                        <h4 style={{ ...styles.headerTitle, marginTop: 24 }}>Change Email</h4>
                        <form style={localFormStyle}>
                            <div style={styles.inputSection}>
                                <label style={styles.inputLabel}>New Email Address</label>
                                <Input
                                    value={emailState.value}
                                    error={emailState.error}
                                    placeholder='Enter your new email'
                                    style={styles.fullWidth}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    compact={true}
                                />
                            </div>
                            <div>
                                <SubmitButton
                                    type='button'
                                    title='Request Change'
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setRequestError(null)
                                        requestEmailChangeMutation.mutate({
                                            emailValue: emailState.value,
                                        })
                                    }}
                                    style={styles.fullWidth}
                                    disabled={isRequestDisabled}
                                >
                                    Send Verification
                                </SubmitButton>

                                {/* Request error */}
                                {requestError && (
                                    <div style={{ color: "#ff4444", marginTop: 6, fontSize: 12 }}>
                                        {requestError}
                                    </div>
                                )}
                            </div>
                        </form>
                    </>
                )}

                {step === 2 && (
                    <>
                        <h4 style={{ ...styles.headerTitle, marginTop: 24 }}>
                            Enter Verification Code
                        </h4>

                        <form style={localFormStyle}>
                            <div style={localInputSection}>
                                <label style={styles.inputLabel}>Verification Code</label>
                                <Input
                                    theRef={codeRef}
                                    placeholder='Enter the code sent to your email'
                                    style={styles.fullWidth}
                                    compact={true}
                                />
                            </div>

                            <div>
                                <SubmitButton
                                    type='button'
                                    title='Verify'
                                    style={styles.fullWidth}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setVerifyError(null)
                                        verifyEmailMutation.mutate({ code: codeRef.current.value })
                                    }}
                                    disabled={isVerifyDisabled}
                                >
                                    Confirm Email
                                </SubmitButton>

                                {/* Verify error or success */}
                                {verifyError && (
                                    <div style={{ color: "#ff4444", marginTop: 6, fontSize: 12 }}>
                                        {verifyError}
                                    </div>
                                )}
                                {verifySuccess && (
                                    <div style={{ color: "white", marginTop: 6, fontSize: 12 }}>
                                        Your email has successfully been changed
                                    </div>
                                )}
                            </div>
                        </form>
                    </>
                )}
            </Box>
        </>
    )
}

const initialChangePasswordFormState = {
    fields: {
        currentPassword: { value: "", error: "" },
        password: { value: "", error: "" },
        confirmPassword: { value: "", error: "" },
    },
    isFormValid: false,
}

const ChangePasswordForm = () => {
    const axiosPrivate = useAxiosPrivate()
    const { isPendingMutations: isMutating } = usePendingMutations(["change-password"])
    const [form, dispatch] = useReducer(changePasswordFormReducer, initialChangePasswordFormState)
    const fields = form.fields
    const pwErrorRef = useRef(null)

    // tighter spacing for password form
    const localFormStyle = { ...styles.form, gap: "6px", marginTop: "12px" }
    const localInputSection = { ...styles.inputSection, gap: 6, marginTop: 6 }

    const changePasswordMutation = useMutation({
        mutationKey: ["change-password"],
        mutationFn: (data) => {
            const { currentPassword, newPassword } = data
            return axiosPrivate
                .put(`${BASE_URL}/api/users/update-password`, {
                    currentPassword,
                    newPassword,
                })
                .then((res) => res.data)
        },
        onError: (err) => {
            // write readable message into the DOM ref underneath the button
            const apiMessage = extractErrorMessage(err) || "Password change failed"
            if (pwErrorRef.current) {
                pwErrorRef.current.textContent = apiMessage
            }
        },
        onSuccess: () => {
            // clear any previous error message and reset the form
            if (pwErrorRef.current) pwErrorRef.current.textContent = ""
            dispatch({ type: "RESET", payload: initialChangePasswordFormState })
        },
    })

    const handleInputChange = (field, value) => {
        dispatch({ type: "UPDATE", payload: { field, value } })
    }

    return (
        <>
            <Box sx={{ width: "100%", height: "100%" }}>
                <>
                    <h4 style={styles.headerTitle}>Change Password</h4>

                    <form style={localFormStyle}>
                        <div style={localInputSection}>
                            <label style={styles.inputLabel}>Current Password</label>
                            <Input
                                value={fields.currentPassword.value}
                                error={fields.currentPassword.error}
                                placeholder='Enter your current password'
                                type='password'
                                onChange={(e) =>
                                    handleInputChange("currentPassword", e.target.value)
                                }
                                style={styles.fullWidth}
                                compact={true}
                            />
                        </div>

                        <div style={localInputSection}>
                            <label style={styles.inputLabel}>New Password</label>
                            <Input
                                value={fields.password.value}
                                error={fields.password.error}
                                placeholder='Enter your new password'
                                type='password'
                                onChange={(e) => handleInputChange("password", e.target.value)}
                                style={styles.fullWidth}
                                compact={true}
                            />
                        </div>

                        <div style={localInputSection}>
                            <label style={styles.inputLabel}>Confirm New Password</label>
                            <Input
                                value={fields.confirmPassword.value}
                                error={fields.confirmPassword.error}
                                placeholder='Confirm your new password'
                                type='password'
                                onChange={(e) =>
                                    handleInputChange("confirmPassword", e.target.value)
                                }
                                style={styles.fullWidth}
                                compact={true}
                            />
                        </div>
                        <SubmitButton
                            type='submit'
                            title='Done'
                            style={styles.fullWidth}
                            disabled={!form.isFormValid || isMutating}
                            onClick={(e) => {
                                e.preventDefault()
                                // clear any previous error before sending
                                if (pwErrorRef.current) pwErrorRef.current.textContent = ""

                                changePasswordMutation.mutate({
                                    currentPassword: fields.currentPassword.value,
                                    newPassword: fields.password.value,
                                })
                            }}
                        >
                            Save Changes
                        </SubmitButton>

                        {changePasswordMutation.isSuccess && (
                            <span style={{ fontSize: 13 }}>
                                Your password was successfully changed
                            </span>
                        )}

                        {/* Mutation error rendered into this DOM ref; font-size 13px */}
                        <div
                            ref={pwErrorRef}
                            style={{ color: "#ff4444", marginTop: 6, fontSize: 13 }}
                        ></div>
                    </form>
                </>
            </Box>
        </>
    )
}

const BlockedUsersForm = ({ profileInfo }) => {
    const axiosPrivate = useAxiosPrivate()
    const queryClient = useQueryClient()
    const { ref, inView } = useInView()
    const { unblockUser } = useUsers()

    const blockedUsersQuery = useInfiniteQuery({
        queryKey: ["blocked-users"],
        queryFn: async ({ pageParam = null }) => {
            const response = await axiosPrivate.get(`${BASE_URL}/api/users/blocked`, {
                params: { cursor: pageParam },
            })
            return response.data
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 5 * 60 * 1000, // 5 minutes
    })

    const unblockMutation = useMutation({
        mutationFn: ({ uData }) => unblockUser({ uData }),
        onMutate: async (vars) => {
            const { uData } = vars

            await queryClient.cancelQueries({ queryKey: ["profile", profileInfo.username] })
            await queryClient.cancelQueries({ queryKey: ["profile", uData?.username] })
        },
        onSuccess: (data, vars) => {
            const { uData } = vars
            queryClient.setQueryData(["profile", uData.username], (prevData) => {
                return produce(prevData, (draft) => {
                    if (!prevData) return draft

                    draft.isBlocked = false
                })
            })

            queryClient.setQueryData(["blocked-users"], (prevData) => {
                return produce(prevData, (draft) => {
                    if (!prevData) return draft

                    draft.pages = draft.pages.map((page) => ({
                        ...page,
                        data: page.data.filter((block) => block.blockedUser._id !== uData._id),
                    }))
                })
            })
        },
        onSettled: (data, _, vars) => {
            const { uData } = vars

            queryClient.invalidateQueries({ queryKey: [profileInfo._id, "following"] })
            queryClient.invalidateQueries({ queryKey: [profileInfo._id, "followers"] })
            queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
            queryClient.invalidateQueries({ queryKey: ["searchUsers"], exact: false })

            queryClient.invalidateQueries({
                queryKey: ["profile", uData.username],
            })
            queryClient.invalidateQueries({
                queryKey: ["profile", profileInfo.username],
            })
            queryClient.invalidateQueries({ queryKey: ["recentSearchers"] })
        },
    })

    useEffect(() => {
        if (inView && blockedUsersQuery.hasNextPage && !blockedUsersQuery.isFetchingNextPage) {
            blockedUsersQuery.fetchNextPage()
        }
    }, [inView, blockedUsersQuery.hasNextPage, blockedUsersQuery.isFetchingNextPage])

    const BlockedUserSkeleton = () => (
        <div style={styles.blockedUserItem}>
            <div style={styles.skeletonAvatar}></div>
            <div style={styles.skeletonContent}>
                <div style={styles.skeletonLine}></div>
            </div>
            <div style={styles.skeletonButton}></div>
        </div>
    )

    return (
        <Box sx={{ width: "100%", height: "100%" }}>
            <h4 style={styles.headerTitle}>Blocked Users</h4>
            <div style={styles.blockedUsersContainer}>
                {blockedUsersQuery.isLoading ? (
                    [...Array(5)].map((_, i) => <BlockedUserSkeleton key={i} />)
                ) : blockedUsersQuery.isError ? (
                    <div style={styles.errorMessage}>
                        Error loading blocked users. Please try again.
                    </div>
                ) : (
                    <>
                        {blockedUsersQuery.data?.pages.map((page) =>
                            page.data.map((block) => (
                                <div
                                    key={block._id}
                                    style={styles.blockedUserItem}
                                >
                                    <ProfilePic
                                        size={40}
                                        src={
                                            block?.blockedUser?.profilePic &&
                                            `${BASE_URL}/uploads/profilePics/${block.blockedUser.profilePic}`
                                        }
                                    />
                                    <div style={styles.blockedUserInfo}>
                                        <span style={styles.blockedUsername}>
                                            {block.blockedUser.username}
                                        </span>
                                    </div>
                                    <SubmitButton
                                        onClick={() =>
                                            unblockMutation.mutate({ uData: block.blockedUser })
                                        }
                                        isDisabled={unblockMutation.isPending}
                                        style={styles.unblockButton}
                                    >
                                        {unblockMutation.isPending ? (
                                            <Spinner
                                                withStyles={false}
                                                size={12}
                                            />
                                        ) : (
                                            "Unblock"
                                        )}
                                    </SubmitButton>
                                </div>
                            ))
                        )}

                        {blockedUsersQuery.data?.pages?.length > 0 &&
                            blockedUsersQuery.data.pages[0].data.length === 0 && (
                                <div style={styles.emptyState}>
                                    <span style={styles.emptyText}>No blocked users</span>
                                </div>
                            )}

                        <div ref={ref}>
                            {blockedUsersQuery.isFetchingNextPage &&
                                [...Array(3)].map((_, i) => (
                                    <BlockedUserSkeleton key={`more-${i}`} />
                                ))}
                        </div>
                    </>
                )}
            </div>
        </Box>
    )
}

const getModalWrapperStyles = (isMobile) => ({
    position: "absolute",
    outline: "none", // Remove white outline when clicking
    ...(isMobile
        ? {
              top: 0,
              left: 0,
              transform: "none",
              height: "100%",
              width: "100%",
          }
        : {
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "460px",
              maxWidth: "95vw",
              height: "85vh",
              minHeight: "400px",
              maxHeight: "1000px",
          }),
    border: isMobile ? "none" : "1px solid var(--darkGrey)",
    backgroundColor: "#000000",
    borderRadius: isMobile ? 0 : 12,
    boxShadow: isMobile ? "none" : "0 8px 32px rgba(0, 0, 0, 0.8)",
    display: "flex",
    flexDirection: "column",
})

const getModalContainerStyles = (isMobile) => ({
    width: "100%",
    padding: isMobile ? "20px 20px 40px 20px" : "20px 24px 40px 24px", // Added more padding at the bottom
    height: "100%",
    minHeight: 0,
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    borderRadius: isMobile ? 0 : "12px",
    "&::-webkit-scrollbar": {
        width: "6px",
    },
    "&::-webkit-scrollbar-track": {
        background: "#1a1a1a",
        borderRadius: "3px",
    },
    "&::-webkit-scrollbar-thumb": {
        background: "#333",
        borderRadius: "3px",
        "&:hover": {
            background: "#444",
        },
    },
})

const styles = {
    headerTitle: {
        fontSize: "20px",
        fontWeight: "700",
        marginTop: 0,
        marginBottom: "16px",
        textAlign: "center",
        color: "#fff",
        letterSpacing: "-0.5px",
    },
    interestsContainer: {
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        marginTop: "10px",
    },
    interestItem: {
        padding: "10px 16px",
        borderRadius: "20px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
        transition: "all 0.2s ease",
        cursor: "pointer",
        color: "#fff",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
    },
    categoryIcon: {
        fontSize: "20px",
        marginRight: "4px",
    },
    interestsLimit: {
        color: "#666",
        fontSize: "12px",
        marginTop: "8px",
        display: "block",
    },
    topRow: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "10px 0",
    },
    linkRow: {
        display: "flex",
        gap: "20px",
        justifyContent: "center",
        marginTop: 10,
        marginBottom: 30, // Increased bottom margin
    },
    link: {
        color: "#007bff",
        cursor: "pointer",
        textDecoration: "none",
        background: "none",
        border: "none",
        padding: "8px 16px",
        fontSize: "14px",
        borderRadius: 6,
        transition: "all 0.2s ease",
        "&:hover": {
            backgroundColor: "rgba(0, 123, 255, 0.1)",
            textDecoration: "underline",
        },
    },
    form: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "24px", // Increased gap between form elements
        marginTop: "20px", // Increased top margin
    },
    fullWidth: {
        width: "100%",
        padding: "12px 0",
    },
    privacySection: {
        marginTop: 30,
        marginBottom: 10,
    },
    privacyContainer: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "20px",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: 12,
        border: "1px solid rgba(255, 255, 255, 0.1)",
    },
    privacyTextContainer: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        marginRight: 20,
    },
    privacyLabel: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#fff",
        marginBottom: 4,
    },
    privacyDescription: {
        fontSize: "13px",
        color: "#aaa",
        lineHeight: 1.4,
    },
    inputSection: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginTop: 8, // Add spacing between input sections
    },
    inputLabel: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#fff",
        marginBottom: 4,
    },
    blockedUsersContainer: {
        maxHeight: "400px",
        overflowY: "auto",
        padding: "10px 0",
    },
    blockedUserItem: {
        display: "flex",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        gap: 12,
    },
    blockedUserInfo: {
        flex: 1,
        display: "flex",
        marginBottom: 5,
        flexDirection: "column",
    },
    blockedUsername: {
        color: "#fff",
        fontSize: "14px",
        fontWeight: "500",
    },
    unblockButton: {
        padding: "6px 16px",
        fontSize: "12px",
        backgroundColor: "#ff4444",
        minWidth: "70px",
        marginLeft: "auto",
        marginBottom: 8,
        width: "100px",
        height: "32px",
    },
    skeletonAvatar: {
        width: 40,
        height: 40,
        borderRadius: "50%",
        backgroundColor: "#333",
        animation: "pulse 1.5s ease-in-out infinite",
    },
    skeletonContent: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    skeletonLine: {
        height: 12,
        backgroundColor: "#333",
        borderRadius: 4,
        width: "60%",
        animation: "pulse 1.5s ease-in-out infinite",
    },
    skeletonButton: {
        width: 70,
        height: 32,
        backgroundColor: "#333",
        borderRadius: 4,
        animation: "pulse 1.5s ease-in-out infinite",
    },
    emptyState: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    emptyText: {
        color: "#aaa",
        fontSize: 16,
    },
    errorMessage: {
        color: "#ff6b6b",
        textAlign: "center",
        padding: 20,
    },
}

export default SettingsModal
