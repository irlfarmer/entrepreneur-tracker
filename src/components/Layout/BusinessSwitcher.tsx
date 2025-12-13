"use client"

import { Fragment, useState } from 'react'
import { Listbox, Transition, Dialog } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon, PlusIcon } from '@heroicons/react/20/solid'
import { useBusiness } from '@/context/BusinessContext'

export default function BusinessSwitcher() {
    const { currentBusiness, availableBusinesses, switchBusiness, addBusiness } = useBusiness()
    const [isOpen, setIsOpen] = useState(false)
    const [newBusinessName, setNewBusinessName] = useState('')

    const handleAddBusiness = (e: React.FormEvent) => {
        e.preventDefault()
        if (newBusinessName.trim()) {
            addBusiness(newBusinessName.trim())
            setNewBusinessName('')
            setIsOpen(false)
        }
    }

    return (
        <>
            <div className="w-56">
                <Listbox value={currentBusiness} onChange={(business) => switchBusiness(business.id)}>
                    <div className="relative mt-1">
                        <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm text-gray-900">
                            <span className="block truncate">{currentBusiness.name}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronUpDownIcon
                                    className="h-5 w-5 text-gray-400"
                                    aria-hidden="true"
                                />
                            </span>
                        </Listbox.Button>
                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                                {availableBusinesses.map((business, businessIdx) => (
                                    <Listbox.Option
                                        key={businessIdx}
                                        className={({ active }) =>
                                            `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                                            }`
                                        }
                                        value={business}
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span
                                                    className={`block truncate ${selected ? 'font-medium' : 'font-normal'
                                                        }`}
                                                >
                                                    {business.name}
                                                </span>
                                                {selected ? (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                ) : null}
                                            </>
                                        )}
                                    </Listbox.Option>
                                ))}
                                <div className="border-t border-gray-100 pt-1">
                                    <button
                                        className="w-full text-left cursor-default select-none py-2 pl-10 pr-4 text-blue-600 hover:bg-blue-50 flex items-center"
                                        onClick={() => setIsOpen(true)}
                                    >
                                        <PlusIcon className="h-4 w-4 mr-2" />
                                        Add Business
                                    </button>
                                </div>
                            </Listbox.Options>
                        </Transition>
                    </div>
                </Listbox>
            </div>

            <Dialog
                open={isOpen}
                onClose={() => setIsOpen(false)}
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
                                    onClick={() => setIsOpen(false)}
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
        </>
    )
}
