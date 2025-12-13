"use client"

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { CheckIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useModal } from '@/context/ModalContext'

export default function GlobalModal() {
    const { modalState, hideModal } = useModal()

    if (!modalState) return null

    const { title, message, type = 'alert', confirmText = 'OK', cancelText = 'Cancel', onConfirm, onCancel, isOpen } = modalState

    const handleConfirm = () => {
        if (onConfirm) onConfirm()
        hideModal()
    }

    const handleCancel = () => {
        if (onCancel) onCancel()
        hideModal()
    }

    const getIcon = () => {
        switch (type) {
            case 'confirm':
            case 'alert':
                return <InformationCircleIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
            case 'success':
                return <CheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
            case 'error':
                return <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
            default:
                return <InformationCircleIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
        }
    }

    const getColorClass = () => {
        switch (type) {
            case 'confirm':
            case 'alert':
                return 'bg-blue-100'
            case 'success':
                return 'bg-green-100'
            case 'error':
                return 'bg-red-100'
            default:
                return 'bg-blue-100'
        }
    }

    const getButtonColorClass = () => {
        switch (type) {
            case 'confirm': // Confirm usually implies an action, often destructive or important
                return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            case 'alert':
                return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            case 'success':
                return 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
            case 'error':
                return 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            default:
                return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        }
    }

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={type === 'alert' || type === 'success' || type === 'error' ? hideModal : () => { }}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        onClick={hideModal}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="sm:flex sm:items-start">
                                    <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${getColorClass()} sm:mx-0 sm:h-10 sm:w-10`}>
                                        {getIcon()}
                                    </div>
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                            {title}
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                {message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${getButtonColorClass()}`}
                                        onClick={handleConfirm}
                                    >
                                        {confirmText}
                                    </button>
                                    {type === 'confirm' && (
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                            onClick={handleCancel}
                                        >
                                            {cancelText}
                                        </button>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
