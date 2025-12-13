"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ModalType = 'alert' | 'confirm' | 'success' | 'error'

interface ModalOptions {
    title: string
    message: string
    type?: ModalType
    confirmText?: string
    cancelText?: string
    onConfirm?: () => void
    onCancel?: () => void
}

interface ModalContextType {
    showModal: (options: ModalOptions) => void
    hideModal: () => void
    modalState: ModalState | null
}

interface ModalState extends ModalOptions {
    isOpen: boolean
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
    const [modalState, setModalState] = useState<ModalState | null>(null)

    const showModal = useCallback((options: ModalOptions) => {
        setModalState({ ...options, isOpen: true })
    }, [])

    const hideModal = useCallback(() => {
        setModalState(null)
    }, [])

    return (
        <ModalContext.Provider value={{ showModal, hideModal, modalState }}>
            {children}
        </ModalContext.Provider>
    )
}

export function useModal() {
    const context = useContext(ModalContext)
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider')
    }
    return context
}
