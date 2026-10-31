'use client';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import { Loader2 } from 'lucide-react';
import type { WorkRecord } from './RecordsContent';

interface RecordFormModalProps {
  open: boolean;
  record: WorkRecord | null;
  onClose: () => void;
  onSave: (data: WorkRecord) => void;
}

type FormData = Omit<WorkRecord, 'id' | 'totalHours'>;

const MACHINE_TYPES = ['Excavator', 'Bulldozer', 'Crane', 'Mixer', 'Grader', 'Backhoe', 'Compactor', 'Loader', 'Piling Rig', 'Dump Truck', 'Other'];
const STATUS_OPTIONS: { value: WorkRecord['status']; label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'completed', label: 'Completed' },
  { value: 'idle', label: 'Idle' },
];

function calcHours(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60; // shift crosses midnight, e.g. 9 PM start, 1 AM end
  if (diff <= 0) return null;
  return Math.round(diff / 60 * 100) / 100;
}

export default function RecordFormModal({ open, record, onClose, onSave }: RecordFormModalProps) {
  const isEdit = !!record;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      machineName: '', machineId: '', machineType: '', entryDate: '',
      projectSite: '', operator: '', jobDescription: '',
      startTime: '', endTime: '', status: 'working',
    },
  });

  useEffect(() => {
    if (record) {
      reset({
        machineName: record.machineName,
        machineId: record.machineId,
        machineType: record.machineType,
        entryDate: record.entryDate,
        projectSite: record.projectSite,
        operator: record.operator,
        jobDescription: record.jobDescription,
        startTime: record.startTime,
        endTime: record.endTime,
        status: record.status,
      });
    } else {
      reset({
        machineName: '', machineId: '', machineType: '', entryDate: '',
        projectSite: '', operator: '', jobDescription: '',
        startTime: '', endTime: '', status: 'working',
      });
    }
  }, [record, reset, open]);

const startTime = watch('startTime');
  const endTime = watch('endTime');
  const status = watch('status');
  const entryDate = watch('entryDate');
  const previewHours = calcHours(startTime, endTime);

  useEffect(() => {
    if (status === 'working' && endTime) {
      setValue('endTime', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function isFutureEndTime(end: string, date: string): boolean {
    if (!end || !date) return false;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (date !== todayStr) return false; // only restrict "today" entries
    const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return end > nowHM;
  }

  // Backend integration point: replace with API call to create/update work record
  const onSubmit = async (data: FormData) => {
    await new Promise(r => setTimeout(r, 600));
    const totalHours = calcHours(data.startTime, data.endTime);
    onSave({
      ...data,
      id: record?.id ?? `rec-${Date.now()}`,
      totalHours,
    });
  };

  const inputCls = (hasError: boolean) =>
    `w-full px-3.5 py-2.5 text-sm bg-input border rounded-md transition-all outline-none placeholder:text-muted-foreground text-foreground
    ${hasError ? 'border-danger focus:shadow-[0_0_0_3px_rgba(226,63,63,0.15)]' : 'border-border focus:input-focus'}`;

  const labelCls = 'block text-sm font-600 text-foreground mb-1.5';
  const errorCls = 'mt-1.5 text-xs text-danger font-500';
  const hintCls = 'mt-1 text-xs text-muted-foreground';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Work Record' : 'New Machine Work Entry'}
      subtitle={isEdit ? `Editing: ${record?.machineName}` : 'Create a new machine work entry'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="px-6 py-5 space-y-5">
          {/* Section: Machine Information */}
          <div>
            <h4 className="text-xs font-700 uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
              Machine Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Machine Name */}
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Machine Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Excavator EC210"
                  className={inputCls(!!errors.machineName)}
                  {...register('machineName', { required: 'Machine name is required' })}
                />
                {errors.machineName && <p className={errorCls}>{errors.machineName.message}</p>}
              </div>

              {/* Machine ID */}
              <div>
                <label className={labelCls}>Machine ID</label>
                <p className={hintCls}>Optional — used for tracking</p>
                <input
                  type="text"
                  placeholder="e.g. EX-015"
                  className={inputCls(false)}
                  {...register('machineId')}
                />
              </div>

              {/* Machine Type */}
              <div>
                <label className={labelCls}>Machine Type</label>
                <p className={hintCls}>Pick a suggestion or type your own</p>
                <input
                  type="text"
                  list="machine-type-options"
                  placeholder="e.g. Excavator, or type a custom type"
                  className={inputCls(false)}
                  {...register('machineType')}
                />
                <datalist id="machine-type-options">
                  {MACHINE_TYPES.map(t => (
                    <option key={`mtype-${t}`} value={t} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Section: Job Details */}
          <div>
            <h4 className="text-xs font-700 uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
              Job Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Entry Date */}
              <div>
                <label className={labelCls}>
                  Entry Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className={inputCls(!!errors.entryDate)}
                  {...register('entryDate', {
                    required: 'Entry date is required',
                    validate: (v) => v <= new Date().toISOString().split('T')[0] || 'Entry date cannot be in the future',
                  })}
                />
                {errors.entryDate && <p className={errorCls}>{errors.entryDate.message}</p>}
              </div>

              {/* Project Site */}
              <div>
                <label className={labelCls}>
                  Project Site / Working Location <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Block-7 Foundation"
                  className={inputCls(!!errors.projectSite)}
                  {...register('projectSite', { required: 'Project site is required' })}
                />
                {errors.projectSite && <p className={errorCls}>{errors.projectSite.message}</p>}
              </div>

              {/* Operator Name */}
              <div>
                <label className={labelCls}>
                  Operator Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  className={inputCls(!!errors.operator)}
                  {...register('operator', { required: 'Operator name is required' })}
                />
                {errors.operator && <p className={errorCls}>{errors.operator.message}</p>}
              </div>

              {/* Status */}
              <div>
                <label className={labelCls}>Machine Status</label>
                <p className={hintCls}>Current operational status</p>
                <select
                  className={inputCls(false)}
                  {...register('status')}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={`stat-${opt.value}`} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Job Description */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Job Description</label>
                <p className={hintCls}>Optional — brief description of work performed</p>
                <textarea
                  rows={3}
                  placeholder="Describe the work being performed..."
                  className={`${inputCls(false)} resize-none`}
                  {...register('jobDescription')}
                />
              </div>
            </div>
          </div>

          {/* Section: Work Hours */}
          <div>
            <h4 className="text-xs font-700 uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
              Work Hours
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Start Time */}
              <div>
                <label className={labelCls}>
                  Start Time <span className="text-danger">*</span>
                </label>
                <input
                  type="time"
                  className={inputCls(!!errors.startTime)}
                  {...register('startTime', {
                    validate: (v) => status === 'idle' || !!v || 'Start time is required (unless status is Idle)',
                  })}
                />
                {errors.startTime && <p className={errorCls}>{errors.startTime.message}</p>}
              </div>

              {/* End Time */}
              <div>
                <label className={labelCls}>
                  End Time {status === 'completed' && <span className="text-danger">*</span>}
                </label>
                <p className={hintCls}>
                  {status === 'working' ? 'Locked — machine is still working. Change status to Completed to set an end time.' : 'Leave blank if still working'}
                </p>
                <input
                  type="time"
                  disabled={status === 'working'}
                  className={`${inputCls(!!errors.endTime)} ${status === 'working' ? 'opacity-60 cursor-not-allowed bg-muted/60' : ''}`}
                  {...register('endTime', {
                    validate: (v) => {
                      if (status === 'completed' && !v) return 'End time is required when status is Completed';
                      if (v && isFutureEndTime(v, entryDate)) return 'End time cannot be later than the current time';
                      return true;
                    },
                  })}
                />
                {errors.endTime && <p className={errorCls}>{errors.endTime.message}</p>}
              </div>

              {/* Auto-calculated hours */}
              <div>
                <label className={labelCls}>Total Working Hours</label>
                <p className={hintCls}>Auto-calculated from times</p>
                <div className={`${inputCls(false)} flex items-center bg-muted/60 cursor-not-allowed`}>
                  {previewHours !== null ? (
                    <span className="font-tabular font-700 text-foreground">{previewHours}h</span>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">
                      {startTime && !endTime ? 'Enter end time to calculate' : 'Enter start & end time'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Hours preview banner */}
            {previewHours !== null && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-secondary rounded-lg border border-primary/20 fade-in">
                <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary text-xs font-800">✓</span>
                </div>
                <p className="text-sm text-secondary-foreground font-600">
                  Total working hours calculated: <span className="font-tabular font-800 text-primary">{previewHours} hours</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-muted/30 rounded-b-xl">
          <p className="text-xs text-muted-foreground">
            <span className="text-danger">*</span> Required fields
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-600 text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-700 btn-primary rounded-lg flex items-center gap-2 min-w-[120px] justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Create Entry'
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}