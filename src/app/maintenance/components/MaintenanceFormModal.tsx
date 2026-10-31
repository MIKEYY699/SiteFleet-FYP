'use client';
import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { MaintenanceRecord, MaintenanceType } from '@/lib/machineData';
import { useMachines } from '@/lib/useMachines';

interface Props {
  open: boolean;
  record: MaintenanceRecord | null;
  onClose: () => void;
  onSave: (data: MaintenanceRecord) => void;
}

const EMPTY: Omit<MaintenanceRecord, 'id'> = {
  machineId: '',
  machineName: '',
  operatorName: '',
  workshopName: '',
  maintenanceDate: new Date().toISOString().split('T')[0],
  maintenanceType: 'Routine',
  partRepairedOrReplaced: '',
  descriptionOfWork: '',
  technicianName: '',
  costOfMaintenance: undefined,
  remarks: '',
  recommendedHoursUntilNext: 250,
  hoursAtMaintenance: 0,
  status: 'Active',
};

export default function MaintenanceFormModal({ open, record, onClose, onSave }: Props) {
  const { machines } = useMachines();
  const [form, setForm] = useState<Omit<MaintenanceRecord, 'id'>>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (record) {
      const { id, ...rest } = record;
      setForm(rest);
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [record, open]);

  const set = (key: keyof typeof form, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleMachineChange = (machineId: string) => {
    const machine = machines.find(m => m.machineId === machineId);
    if (machine) {
      set('machineId', machineId);
      set('machineName', machine.name);
      set('operatorName', machine.operator);
      set('hoursAtMaintenance', machine.totalLifetimeHours);
    } else {
      set('machineId', machineId);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.machineId) e.machineId = 'Machine is required';
    if (!form.maintenanceDate) e.maintenanceDate = 'Date is required';
    if (!form.partRepairedOrReplaced) e.partRepairedOrReplaced = 'Part is required';
    if (!form.descriptionOfWork) e.descriptionOfWork = 'Description is required';
    if (form.costOfMaintenance === undefined || form.costOfMaintenance === null || Number.isNaN(form.costOfMaintenance)) e.costOfMaintenance = 'Cost is required';
    if (!form.recommendedHoursUntilNext || form.recommendedHoursUntilNext <= 0) e.recommendedHoursUntilNext = 'Must be > 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      id: record?.id ?? `maint-${Date.now()}`,
      ...form,
    });
  };

  const inputCls = (field: string) =>
    `w-full px-3 py-2 text-sm bg-input border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 ${errors[field] ? 'border-danger' : 'border-border'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
      subtitle="Record machine repair, part replacement, and next maintenance schedule"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Machine & Operator */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Machine <span className="text-danger">*</span></label>
            <select
              value={form.machineId}
              onChange={e => handleMachineChange(e.target.value)}
              className={inputCls('machineId')}
            >
              <option value="">Select machine...</option>
              {machines.map(m => (
                <option key={m.id} value={m.machineId}>{m.name} ({m.machineId})</option>
              ))}
            </select>
            {errors.machineId && <p className="text-2xs text-danger mt-1">{errors.machineId}</p>}
          </div>
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Operator Name</label>
            <input type="text" value={form.operatorName} onChange={e => set('operatorName', e.target.value)} className={inputCls('operatorName')} placeholder="Auto-filled from machine" />
          </div>
        </div>

        {/* Date, Type, Workshop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Maintenance Date <span className="text-danger">*</span></label>
            <input type="date" value={form.maintenanceDate} onChange={e => set('maintenanceDate', e.target.value)} className={inputCls('maintenanceDate')} />
            {errors.maintenanceDate && <p className="text-2xs text-danger mt-1">{errors.maintenanceDate}</p>}
          </div>
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Maintenance Type <span className="text-danger">*</span></label>
            <select value={form.maintenanceType} onChange={e => set('maintenanceType', e.target.value as MaintenanceType)} className={inputCls('maintenanceType')}>
              <option value="Routine">Routine</option>
              <option value="Repair">Repair</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Workshop Name (Optional)</label>
            <input type="text" value={form.workshopName ?? ''} onChange={e => set('workshopName', e.target.value)} className={inputCls('workshopName')} placeholder="e.g. SKB Workshop Bay-1" />
          </div>
        </div>

        {/* Part & Technician */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Part Repaired / Replaced <span className="text-danger">*</span></label>
            <input type="text" value={form.partRepairedOrReplaced} onChange={e => set('partRepairedOrReplaced', e.target.value)} className={inputCls('partRepairedOrReplaced')} placeholder="e.g. Hydraulic Pump, Engine Oil" />
            {errors.partRepairedOrReplaced && <p className="text-2xs text-danger mt-1">{errors.partRepairedOrReplaced}</p>}
          </div>
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Technician / Mechanic (Optional)</label>
            <input type="text" value={form.technicianName ?? ''} onChange={e => set('technicianName', e.target.value)} className={inputCls('technicianName')} placeholder="Technician name" />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-600 text-foreground mb-1.5">Description of Work <span className="text-danger">*</span></label>
          <textarea
            value={form.descriptionOfWork}
            onChange={e => set('descriptionOfWork', e.target.value)}
            rows={3}
            className={inputCls('descriptionOfWork')}
            placeholder="Describe the work performed..."
          />
          {errors.descriptionOfWork && <p className="text-2xs text-danger mt-1">{errors.descriptionOfWork}</p>}
        </div>

        {/* Hours & Cost */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
<label className="block text-xs font-600 text-foreground mb-1">Recommended Hours Until Next <span className="text-danger">*</span></label>
            <p className="text-2xs text-muted-foreground mb-1.5">How many more hours this part is good for before it's due again (e.g. service every 250h)</p>            <input
              type="number"
              min={1}
              value={form.recommendedHoursUntilNext}
              onChange={e => set('recommendedHoursUntilNext', Number(e.target.value))}
              className={inputCls('recommendedHoursUntilNext')}
              placeholder="e.g. 250"
            />
            {errors.recommendedHoursUntilNext && <p className="text-2xs text-danger mt-1">{errors.recommendedHoursUntilNext}</p>}
          </div>
          <div>
<label className="block text-xs font-600 text-foreground mb-1">Machine Hours at Maintenance</label>
            <p className="text-2xs text-muted-foreground mb-1.5">The machine's total hour reading right now, like an odometer</p>            <input
              type="number"
              min={0}
              value={form.hoursAtMaintenance}
              onChange={e => set('hoursAtMaintenance', Number(e.target.value))}
              className={inputCls('hoursAtMaintenance')}
            />
          </div>
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Cost <span className="text-danger">*</span></label>
            <input
              type="number"
              min={0}
              value={form.costOfMaintenance ?? ''}
              onChange={e => set('costOfMaintenance', e.target.value ? Number(e.target.value) : undefined)}
              className={inputCls('costOfMaintenance')}
              placeholder="Rs. Amount"
            />
            {errors.costOfMaintenance && <p className="text-2xs text-danger mt-1">{errors.costOfMaintenance}</p>}
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-600 text-foreground mb-1.5">Remarks (Optional)</label>
          <input type="text" value={form.remarks ?? ''} onChange={e => set('remarks', e.target.value)} className={inputCls('remarks')} placeholder="Additional notes..." />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg text-sm font-600">
            Cancel
          </button>
          <button type="submit" className="btn-primary px-5 py-2 rounded-lg text-sm font-600">
            {record ? 'Save Changes' : 'Add Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
