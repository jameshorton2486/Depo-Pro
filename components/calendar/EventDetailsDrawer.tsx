'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  X,
  Calendar,
  MapPin,
  Video,
  User,
  FileText,
  AlertCircle,
  ExternalLink,
  Edit,
  Briefcase,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type {
  EventDetailsPanelProps} from './calendar.types';
import {
  STATUS_COLORS,
  LOCATION_TYPE_LABELS,
  DEPONENT_ROLE_LABELS,
} from './calendar.types';
import { cn } from '@/lib/utils';

// ============================================
// EVENT DETAILS DRAWER COMPONENT
// ============================================

export function EventDetailsDrawer({
  event,
  isOpen,
  onClose,
  onEdit,
  onConvertToJob,
  onCancel,
}: EventDetailsPanelProps) {
  if (!event) return null;

  const colors = STATUS_COLORS[event.status];
  const hasJob = !!event.jobId;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 transition-opacity" />
        </Transition.Child>

        {/* Drawer */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="bg-gray-50 px-6 py-4 border-b">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <Dialog.Title className="text-lg font-semibold text-gray-900 truncate">
                            {event.deponentName}
                          </Dialog.Title>
                          <p className="mt-1 text-sm text-gray-500 truncate">
                            {event.caseStyle}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                          onClick={onClose}
                        >
                          <span className="sr-only">Close panel</span>
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="mt-3">
                        <Badge
                          className={cn(colors.bg, colors.text, 'border', colors.border)}
                        >
                          {event.status.replace('_', ' ')}
                        </Badge>
                        {hasJob && (
                          <Badge variant="outline" className="ml-2">
                            <Briefcase className="h-3 w-3 mr-1" />
                            Job Created
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                      {/* Date & Time */}
                      <Section title="Date & Time" icon={Calendar}>
                        <div className="space-y-2">
                          <InfoRow
                            label="Date"
                            value={format(new Date(event.start), 'EEEE, MMMM d, yyyy')}
                          />
                          <InfoRow
                            label="Time"
                            value={`${format(new Date(event.start), 'h:mm a')}${
                              event.end ? ` - ${format(new Date(event.end), 'h:mm a')}` : ''
                            }`}
                          />
                        </div>
                      </Section>

                      <Separator className="my-4" />

                      {/* Location */}
                      <Section title="Location" icon={event.locationType === 'IN_PERSON' ? MapPin : Video}>
                        <div className="space-y-2">
                          <InfoRow
                            label="Type"
                            value={LOCATION_TYPE_LABELS[event.locationType]}
                          />
                          {event.locationAddress && (
                            <InfoRow label="Address" value={event.locationAddress} />
                          )}
                          {event.zoomJoinUrl && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Meeting Link</span>
                              <a
                                href={event.zoomJoinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                Join Meeting
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </Section>

                      <Separator className="my-4" />

                      {/* Deponent Info */}
                      <Section title="Deponent Information" icon={User}>
                        <div className="space-y-2">
                          <InfoRow label="Name" value={event.deponentName} />
                          {event.deponentRole && (
                            <InfoRow
                              label="Role"
                              value={DEPONENT_ROLE_LABELS[event.deponentRole]}
                            />
                          )}
                          {event.caseNumber && (
                            <InfoRow label="Case Number" value={event.caseNumber} />
                          )}
                        </div>
                      </Section>

                      <Separator className="my-4" />

                      {/* Assigned Reporter */}
                      <Section title="Assigned Reporter" icon={User}>
                        {event.assignedReporter ? (
                          <div className="space-y-2">
                            <InfoRow
                              label="Name"
                              value={`${event.assignedReporter.firstName} ${event.assignedReporter.lastName}`}
                            />
                            <InfoRow label="Email" value={event.assignedReporter.email} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-orange-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">No reporter assigned</span>
                          </div>
                        )}
                      </Section>

                      {/* Requirements */}
                      {(event.interpreterRequired ||
                        event.videographerRequired ||
                        event.realtimeRequired) && (
                        <>
                          <Separator className="my-4" />
                          <Section title="Special Requirements" icon={AlertCircle}>
                            <div className="flex flex-wrap gap-2">
                              {event.interpreterRequired && (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                  Interpreter: {event.interpreterLanguage || 'Required'}
                                </Badge>
                              )}
                              {event.videographerRequired && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  Videographer Required
                                </Badge>
                              )}
                              {event.realtimeRequired && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  Realtime Required
                                </Badge>
                              )}
                            </div>
                          </Section>
                        </>
                      )}

                      {/* Notes */}
                      {event.notes && (
                        <>
                          <Separator className="my-4" />
                          <Section title="Notes" icon={FileText}>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {event.notes}
                            </p>
                          </Section>
                        </>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t bg-gray-50 px-6 py-4">
                      <div className="flex flex-col gap-2">
                        {/* Primary Action */}
                        {!hasJob && event.status !== 'CANCELLED' && onConvertToJob && (
                          <Button
                            className="w-full"
                            onClick={() => onConvertToJob(event.id)}
                          >
                            <Briefcase className="h-4 w-4 mr-2" />
                            Convert to Job
                          </Button>
                        )}
                        
                        {hasJob && (
                          <Button className="w-full" variant="outline" asChild>
                            <a href={`/jobs/${event.jobId}`}>
                              <Briefcase className="h-4 w-4 mr-2" />
                              View Job
                            </a>
                          </Button>
                        )}

                        {/* Secondary Actions */}
                        <div className="flex gap-2">
                          {onEdit && event.status !== 'CANCELLED' && (
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => onEdit(event)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          )}
                          {onCancel && event.status !== 'CANCELLED' && event.status !== 'COMPLETED' && (
                            <Button
                              variant="outline"
                              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => onCancel(event.id)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, children }: SectionProps) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
        <Icon className="h-4 w-4 text-gray-500" />
        {title}
      </h3>
      {children}
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}

export default EventDetailsDrawer;
