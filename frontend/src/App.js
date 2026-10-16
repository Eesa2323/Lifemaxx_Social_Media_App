import React from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Provider } from "react-redux"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { store } from "../src/store/store"
import SignupPage from "./pages/SignupPage"
import LoginPage from "./pages/LoginPage"
import Communities from "./pages/Communities"
import CommunityChat from "./pages/CommunityChat"
import HomePage from "./pages/HomePage"
import JourneysPage from "./pages/JourneysPage"
import ProfilePage from "./pages/ProfilePage"
import Layout from "./components/Layout"
import PersistLogin from "./components/PersistLogin"
import "./App.css"
import JourneyViewer from "./pages/JourneyViewer"
import Chats from "./pages/Chats"
import { ChatProvider } from "./contexts/ChatContext"
import { NotificationProvider } from "./contexts/NotificationContext"
import { SidebarProvider } from "./contexts/SidebarContext"
import { PostsProvider } from "./contexts/PostContext"

import StartupPage from "./pages/StartupPage"
import DiscoverPage from "./pages/DiscoverPage"
import ConnectPage from "./pages/ConnectPage"
import PostPage from "./pages/PostPage"
import UserStoriesPage from "./pages/UserStoriesPage"
import ResetPassword, { ResetPasswordRequest, ResetPasswordVerify } from "./pages/ResetPassword"
import { useEffect } from "react"

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
        },
    },
})

const App = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <ReactQueryDevtools initialIsOpen={false} />
            <Provider store={store}>
                <Router>
                    <SidebarProvider>
                        <PostsProvider>
                            <Layout>
                                <ChatProvider>
                                    <NotificationProvider>
                                        <Routes>
                                            <Route
                                                path='/signup'
                                                element={<SignupPage />}
                                            />

                                            <Route
                                                path='/reset-password'
                                                element={<ResetPasswordRequest />}
                                            />
                                            <Route
                                                path='/reset-password/verify'
                                                element={<ResetPasswordVerify />}
                                            />
                                            <Route
                                                path='/reset-password/reset'
                                                element={<ResetPassword />}
                                            />

                                            <Route
                                                path='/login'
                                                element={<LoginPage />}
                                            />

                                            <Route element={<PersistLogin />}>
                                                <Route
                                                    path='/communities'
                                                    element={<Communities />}
                                                />
                                                <Route
                                                    path='/communities/:communityId'
                                                    element={<CommunityChat />}
                                                />
                                                <Route
                                                    path='/journeys/:id'
                                                    element={<JourneyViewer />}
                                                />
                                                {/* <Route
                                                path='/journeys'
                                                element={<JourneysPage />}
                                            /> */}
                                                <Route
                                                    path='/startups'
                                                    element={<StartupPage />}
                                                />
                                                <Route
                                                    path='/chats'
                                                    element={<Chats />}
                                                />
                                                <Route
                                                    path='/chats'
                                                    element={<Chats />}
                                                />
                                                <Route
                                                    path='/'
                                                    element={<HomePage />}
                                                />
                                                <Route
                                                    path='/profile/:username'
                                                    element={<ProfilePage />}
                                                />

                                                <Route
                                                    path='/discover'
                                                    element={<DiscoverPage />}
                                                />
                                                <Route
                                                    path='/connect'
                                                    element={<ConnectPage />}
                                                />
                                                <Route
                                                    path='/posts/:id'
                                                    element={<PostPage />}
                                                />
                                                <Route
                                                    path='/stories/:userId'
                                                    element={<UserStoriesPage />}
                                                />
                                            </Route>
                                        </Routes>
                                    </NotificationProvider>
                                </ChatProvider>
                            </Layout>
                        </PostsProvider>
                    </SidebarProvider>
                </Router>
            </Provider>
        </QueryClientProvider>
    )
}

export default App
