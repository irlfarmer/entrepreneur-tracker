"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Menu, Transition } from "@headlessui/react"
import { 
  Bars3Icon, 
  UserCircleIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline"
import { Fragment } from "react"
import NotificationDropdown from "@/components/Notifications/NotificationDropdown"

interface HeaderProps {
  onMobileMenuClick: () => void
}

interface UserData {
  companyName?: string
  profileImage?: string
}

export default function Header({ onMobileMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    if (session?.user?.email) {
      fetchUserData()
    }
  }, [session?.user?.email])

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user/settings')
      const data = await response.json()
      if (data.success) {
        setUserData(data.data)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Left side - Mobile menu button and logo */}
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={onMobileMenuClick}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            
            <div className="flex items-center lg:ml-0 ml-4">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-blue-600">
                  {userData?.companyName || session?.user?.companyName || "Sales Tracker"}
                </h1>
              </div>
            </div>
          </div>

          {/* Right side - Notifications and user menu */}
          <div className="flex items-center gap-x-4">
            {/* Notifications */}
            <NotificationDropdown />

            {/* User menu */}
            <Menu as="div" className="relative ml-3">
              <div>
                <Menu.Button className="flex items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <span className="sr-only">Open user menu</span>
                  <div className="flex items-center space-x-2">
                    {userData?.profileImage ? (
                      <img
                        className="h-8 w-8 rounded-full object-cover"
                        src={userData.profileImage}
                        alt="Profile"
                      />
                    ) : session?.user?.image ? (
                      <img
                        className="h-8 w-8 rounded-full object-cover"
                        src={session.user.image}
                        alt="Profile"
                      />
                    ) : (
                      <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    )}
                    <span className="hidden md:block text-sm font-medium text-gray-700">
                      {userData?.companyName || session?.user?.name || session?.user?.email}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <Menu.Item>
                    {({ active }) => (
                      <a
                        href="/profile"
                        className={`${
                          active ? "bg-gray-100" : ""
                        } block px-4 py-2 text-sm text-gray-700`}
                      >
                        Your Profile
                      </a>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <a
                        href="/settings"
                        className={`${
                          active ? "bg-gray-100" : ""
                        } block px-4 py-2 text-sm text-gray-700`}
                      >
                        Settings
                      </a>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => signOut()}
                        className={`${
                          active ? "bg-gray-100" : ""
                        } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                      >
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  )
} 