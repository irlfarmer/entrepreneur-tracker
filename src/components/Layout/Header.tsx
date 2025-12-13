"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Menu, Transition } from "@headlessui/react"
import { 
  Bars3Icon, 
  UserCircleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon
} from "@heroicons/react/24/outline"
import { PlusIcon, CheckIcon } from '@heroicons/react/20/solid'
import { Fragment } from "react"
import { Dialog } from '@headlessui/react'
import NotificationDropdown from "@/components/Notifications/NotificationDropdown"
import { useBusiness } from "@/context/BusinessContext"

interface HeaderProps {
  onMobileMenuClick: () => void
}

interface UserData {
  companyName?: string
  profileImage?: string
}

export default function Header({ onMobileMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const { currentBusiness, availableBusinesses, switchBusiness, addBusiness, isLoading: isBusinessLoading } = useBusiness()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isAddBusinessOpen, setIsAddBusinessOpen] = useState(false)
  const [newBusinessName, setNewBusinessName] = useState('')

  useEffect(() => {
    if (session?.user?.email) {
      fetchUserData()
    }
  }, [session?.user?.email, currentBusiness.id])

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/user/settings?businessId=${currentBusiness.id}`)
      const data = await response.json()
      if (data.success) {
        setUserData(data.data)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const handleAddBusiness = (e: React.FormEvent) => {
    e.preventDefault()
    if (newBusinessName.trim()) {
        addBusiness(newBusinessName.trim())
        setNewBusinessName('')
        setIsAddBusinessOpen(false)
    }
  }

  return (
    <>
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
                  {currentBusiness.name || "Sales Tracker"}
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
                <Menu.Button className="flex items-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
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
                      {currentBusiness.name}
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
                <Menu.Items className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-lg bg-white py-2 shadow-xl focus:outline-none">
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch Business</p>
                  </div>
                  {availableBusinesses.map((business) => (
                    <Menu.Item key={business.id}>
                      {({ active }) => (
                        <button
                          onClick={() => switchBusiness(business.id)}
                          className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} group flex items-center w-full px-4 py-2 text-sm`}
                        >
                          {business.id === currentBusiness.id ? (
                              <CheckIcon className="mr-3 h-5 w-5 text-blue-500" />
                          ) : (
                              <span className="w-5 mr-3" />
                          )}
                          {business.name}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                  <div className="border-t border-gray-200 my-1" />
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => setIsAddBusinessOpen(true)}
                        className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} group flex items-center w-full px-4 py-2 text-sm`}
                      >
                        <PlusIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                        Add Business
                      </button>
                    )}
                  </Menu.Item>
                  <div className="border-t border-gray-200 my-1" />
                  <Menu.Item>
                    {({ active }) => (
                      <a
                        href="/profile"
                        className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} group flex items-center w-full px-4 py-2 text-sm`}
                      >
                        <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                        Your Profile
                      </a>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <a
                        href="/settings"
                        className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} group flex items-center w-full px-4 py-2 text-sm`}
                      >
                        <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                        Settings
                      </a>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => signOut()}
                        className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} group flex items-center w-full px-4 py-2 text-sm`}
                      >
                        <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-blue-500" />
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

    <Dialog
        open={isAddBusinessOpen}
        onClose={() => setIsAddBusinessOpen(false)}
        className="relative z-50"
    >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6 shadow-xl w-full">
                <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 mb-4">Add New Business Profile</Dialog.Title>

                <form onSubmit={handleAddBusiness}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Business Name
                        </label>
                        <input
                            type="text"
                            value={newBusinessName}
                            onChange={(e) => setNewBusinessName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. Consulting"
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => setIsAddBusinessOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!newBusinessName.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </Dialog.Panel>
        </div>
    </Dialog>
  </>)
}