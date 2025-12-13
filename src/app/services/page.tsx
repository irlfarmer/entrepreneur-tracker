"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import { useBusiness } from "@/context/BusinessContext"
import { useModal } from "@/context/ModalContext"
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon, Cog6ToothIcon } from "@heroicons/react/24/outline"
import { SerializedService } from "@/lib/types"
import ServiceStats from "@/components/Services/ServiceStats"
import ServiceForm from "@/components/Services/ServiceForm"
import CategoryFieldManager from "@/components/Inventory/CategoryFieldManager"

export default function ServicesPage() {
    const { data: session } = useSession()
    const { currentBusiness } = useBusiness()
    const { showModal } = useModal()
    const router = useRouter()
    const [services, setServices] = useState<SerializedService[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

    // We only need editingService state now, form data is handled by ServiceForm
    const [editingService, setEditingService] = useState<SerializedService | null>(null)

    const fetchServices = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                businessId: currentBusiness?.id || '',
                ...(search && { search })
            })
            const res = await fetch(`/api/services?${params}`)
            const data = await res.json()
            if (data.success) {
                setServices(data.data)
            }
        } catch (error) {
            console.error("Failed to fetch services", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (session?.user && currentBusiness) {
            fetchServices()
        }
    }, [session, currentBusiness?.id, search])

    const handleEdit = (service: SerializedService) => {
        setEditingService(service)
        setIsModalOpen(true)
    }

    const handleDelete = (serviceId: string) => {
        showModal({
            title: 'Delete Service',
            message: 'Are you sure you want to delete this service? This action cannot be undone.',
            type: 'confirm',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/services/${serviceId}`, { method: 'DELETE' })
                    const data = await res.json()

                    if (data.success) {
                        setServices(services.filter(s => s._id !== serviceId))
                        showModal({ title: 'Success', message: 'Service deleted successfully', type: 'success' })
                    } else {
                        showModal({ title: 'Error', message: data.error || "Failed to delete service", type: 'error' })
                    }
                } catch (error) {
                    showModal({ title: 'Error', message: "An error occurred", type: 'error' })
                }
            }
        })
    }

    const handleDuplicate = (service: SerializedService) => {
        // For services, duplication just means opening the form with the same data minus ID
        // The ServiceForm will treat it as "New" but populated if we pass it correctly.
        // However, ServiceForm expects 'service' prop to imply "Editing".
        // To support duplicate, we should probably handle it here or modify ServiceForm.
        // Simple way: Create a "temp" service object without ID.
        const duplicate = { ...service, _id: undefined, name: `${service.name} (Copy)` } as any
        setEditingService(duplicate)
        setIsModalOpen(true)
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
                        <p className="text-sm text-gray-500">Manage your service offerings</p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Cog6ToothIcon className="w-5 h-5 mr-2" />
                            Manage Categories
                        </button>
                        <button
                            onClick={() => {
                                setEditingService(null)
                                setIsModalOpen(true)
                            }}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Add Service
                        </button>
                    </div>
                </div>

                <ServiceStats userId={session?.user?.id || ''} searchParams={{ search }} />

                {/* Search */}
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search services..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                </div>

                {/* List */}
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
                    </div>
                ) : services.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500">No services found. Add one to get started!</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {services.map((service) => (
                            <div key={service._id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-lg text-gray-900">{service.name}</h3>
                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(service.price))}
                                    </span>
                                </div>
                                {service.category && (
                                    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded mb-2">
                                        {service.category}
                                    </span>
                                )}
                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{service.description || "No description"}</p>
                                <div className="text-xs text-gray-400 mt-auto pt-4 flex justify-between items-center bg-gray-50 -mx-6 -mb-6 p-4 border-t border-gray-100">
                                    <span>Added {new Date(service.createdAt).toLocaleDateString()}</span>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleDuplicate(service)}
                                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                                            title="Duplicate"
                                        >
                                            <DocumentDuplicateIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(service)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                            title="Edit"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(service._id!)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                            <h2 className="text-xl font-bold mb-4 text-gray-900">
                                {editingService ? 'Edit Service' : 'Add New Service'}
                            </h2>
                            <ServiceForm
                                service={editingService}
                                onSuccess={() => {
                                    setIsModalOpen(false)
                                    setEditingService(null)
                                    fetchServices()
                                    showModal({ title: 'Success', message: `Service ${editingService ? 'updated' : 'created'} successfully`, type: 'success' })
                                }}
                                onCancel={() => {
                                    setIsModalOpen(false)
                                    setEditingService(null)
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Settings Modal */}
                <SettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    onUpdate={() => { }} // No-op or trigger context refresh if needed, but form handles its own fetching
                    businessId={currentBusiness?.id}
                />
            </div>
        </DashboardLayout>
    )
}

function SettingsModal({ isOpen, onClose, onUpdate, businessId }: { isOpen: boolean; onClose: () => void; onUpdate: () => void, businessId?: string }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Manage Categories & Fields</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <Cog6ToothIcon className="w-6 h-6" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>
                <div className="p-0 flex-1 overflow-auto">
                    <CategoryFieldManager businessId={businessId} defaultTab="service-categories" />
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button
                        onClick={() => { onClose(); onUpdate(); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
