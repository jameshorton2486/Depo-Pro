'use client';

// ═══════════════════════════════════════════════════════════════
// RX QUEUE MANAGER
// components/billing/rx-queue-manager.tsx
//
// Admin interface for managing manual forensic enhancement queue
// Allows operators to claim, process, and complete RX jobs
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Wrench,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  FileAudio,
  Timer,
  User,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface RxQueueJob {
  id: string;
  jobId: string;
  jobTitle?: string;
  caseName?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignedToId?: string;
  assignedToName?: string;
  originalFileUrl: string;
  enhancedFileUrl?: string;
  notes?: string;
  timeSpentMinutes?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface RxChecklist {
  voiceDeNoise: boolean;
  dialogueIsolate: boolean;
  deReverb: boolean;
  spectralRepair: boolean;
  levelingCompression: boolean;
}

interface RxQueueManagerProps {
  firmId?: string;
  operatorMode?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const getPriorityBadge = (priority: RxQueueJob['priority']) => {
  const config = {
    LOW: { color: 'bg-gray-100 text-gray-700', label: 'Low' },
    NORMAL: { color: 'bg-blue-100 text-blue-700', label: 'Normal' },
    HIGH: { color: 'bg-orange-100 text-orange-700', label: 'High' },
    URGENT: { color: 'bg-red-100 text-red-700', label: 'Urgent' },
  };
  const { color, label } = config[priority];
  return <Badge className={color}>{label}</Badge>;
};

const getStatusBadge = (status: RxQueueJob['status']) => {
  const config = {
    PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
    IN_PROGRESS: { color: 'bg-blue-100 text-blue-700', icon: Wrench, label: 'In Progress' },
    COMPLETED: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Completed' },
    FAILED: { color: 'bg-red-100 text-red-700', icon: AlertTriangle, label: 'Failed' },
  };
  const { color, icon: Icon, label } = config[status];
  return (
    <Badge className={`${color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function RxQueueManager({ firmId, operatorMode = false }: RxQueueManagerProps) {
  const [queue, setQueue] = useState<RxQueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedJob, setSelectedJob] = useState<RxQueueJob | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  
  // Complete job form state
  const [completionData, setCompletionData] = useState({
    timeSpentMinutes: 0,
    enhancedFileUrl: '',
    notes: '',
    checklist: {
      voiceDeNoise: false,
      dialogueIsolate: false,
      deReverb: false,
      spectralRepair: false,
      levelingCompression: false,
    } as RxChecklist,
  });

  // Fetch queue
  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (firmId) params.append('firmId', firmId);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      
      const response = await fetch(`/api/rx-queue?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch queue');
      }
      
      const data = await response.json();
      setQueue(data.queue || []);
    } catch (_err) {
      toast.error('Failed to load RX queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [firmId, statusFilter]);

  // Start processing
  const handleStartProcessing = async (job: RxQueueJob) => {
    try {
      const response = await fetch(`/api/rx-queue/${job.jobId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start processing');
      }

      toast.success('Processing started');
      fetchQueue();
    } catch (_err) {
      toast.error('Failed to start processing');
    }
  };

  // Complete processing
  const handleCompleteProcessing = async () => {
    if (!selectedJob) return;

    // Validate checklist
    const checklistValues = Object.values(completionData.checklist);
    if (!checklistValues.some(v => v)) {
      toast.error('Please complete at least one checklist item');
      return;
    }

    if (!completionData.timeSpentMinutes || completionData.timeSpentMinutes <= 0) {
      toast.error('Please enter time spent');
      return;
    }

    try {
      const response = await fetch(`/api/rx-queue/${selectedJob.jobId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeSpentMinutes: completionData.timeSpentMinutes,
          enhancedFileUrl: completionData.enhancedFileUrl,
          notes: completionData.notes,
          toolsUsed: Object.entries(completionData.checklist)
            .filter(([, v]) => v)
            .map(([k]) => k),
          checklist: completionData.checklist,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete processing');
      }

      toast.success('RX processing completed');
      setCompleteDialogOpen(false);
      setSelectedJob(null);
      setCompletionData({
        timeSpentMinutes: 0,
        enhancedFileUrl: '',
        notes: '',
        checklist: {
          voiceDeNoise: false,
          dialogueIsolate: false,
          deReverb: false,
          spectralRepair: false,
          levelingCompression: false,
        },
      });
      fetchQueue();
    } catch (_err) {
      toast.error('Failed to complete processing');
    }
  };

  // Stats
  const stats = {
    pending: queue.filter(j => j.status === 'PENDING').length,
    inProgress: queue.filter(j => j.status === 'IN_PROGRESS').length,
    completed: queue.filter(j => j.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-blue-500" />
            RX Enhancement Queue
          </h2>
          <p className="text-muted-foreground">
            Manual forensic audio enhancement jobs
          </p>
        </div>
        <Button variant="outline" onClick={fetchQueue}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label>Filter by Status:</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Queue Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileAudio className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No jobs in queue</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{job.jobTitle || job.jobId}</p>
                        {job.caseName && (
                          <p className="text-xs text-muted-foreground">{job.caseName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getPriorityBadge(job.priority)}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>
                      {job.assignedToName ? (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {job.assignedToName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(job.createdAt)}
                    </TableCell>
                    <TableCell>
                      {job.status === 'PENDING' && operatorMode && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStartProcessing(job)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                      {job.status === 'IN_PROGRESS' && operatorMode && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedJob(job);
                            setCompleteDialogOpen(true);
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      )}
                      {job.status === 'COMPLETED' && job.enhancedFileUrl && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          asChild
                        >
                          <a href={job.enhancedFileUrl} target="_blank" rel="noopener noreferrer">
                            <FileAudio className="h-3 w-3 mr-1" />
                            Download
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete RX Processing</DialogTitle>
            <DialogDescription>
              Record the work completed for this forensic enhancement job.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Time Spent */}
            <div className="space-y-2">
              <Label htmlFor="rx-time-spent" className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Time Spent (minutes)
              </Label>
              <Input
                id="rx-time-spent"
                type="number"
                min="1"
                value={completionData.timeSpentMinutes || ''}
                onChange={(e) => setCompletionData({
                  ...completionData,
                  timeSpentMinutes: parseInt(e.target.value) || 0,
                })}
                placeholder="Enter minutes spent"
              />
            </div>

            {/* Enhanced File URL */}
            <div className="space-y-2">
              <Label htmlFor="rx-enhanced-url" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Enhanced File URL
              </Label>
              <Input
                id="rx-enhanced-url"
                value={completionData.enhancedFileUrl}
                onChange={(e) => setCompletionData({
                  ...completionData,
                  enhancedFileUrl: e.target.value,
                })}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                Upload the enhanced file to storage and paste the URL here
              </p>
            </div>

            <Separator />

            {/* RX Checklist */}
            <div className="space-y-3">
              <Label className="font-medium">RX Enhancement Checklist</Label>
              
              {[
                { key: 'voiceDeNoise', label: 'Voice De-noise' },
                { key: 'dialogueIsolate', label: 'Dialogue Isolate' },
                { key: 'deReverb', label: 'De-reverb' },
                { key: 'spectralRepair', label: 'Spectral Repair' },
                { key: 'levelingCompression', label: 'Leveling/Compression' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={completionData.checklist[key as keyof RxChecklist]}
                    onCheckedChange={(checked) => setCompletionData({
                      ...completionData,
                      checklist: {
                        ...completionData.checklist,
                        [key]: !!checked,
                      },
                    })}
                  />
                  <Label htmlFor={key} className="cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Operator Notes</Label>
              <Textarea
                value={completionData.notes}
                onChange={(e) => setCompletionData({
                  ...completionData,
                  notes: e.target.value,
                })}
                placeholder="Any additional notes about the enhancement..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteProcessing}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RxQueueManager;
