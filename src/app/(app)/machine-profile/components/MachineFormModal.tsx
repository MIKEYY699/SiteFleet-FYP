'use client';
import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { Machine } from '@/lib/useMachines';
import { saveMachine, type MachineInput } from '@/lib/machineActions';

const MACHINE_TYPES = ['Excavator', 'Bulldozer', 'Crane', 'Mixer', 'Grader', 'Backhoe', 'Compactor', 'Loader', 'Piling Rig', 'Dump Truck', 'Other'];

// Mount only while open (e.g. `{open && <MachineFormModal … />}`) so the form starts
// from the given machine each time.
interface Props {
  machine: Machine | null;
  projectId: string | null;
  // Codes already used in this project, to stop accidental duplicates.
  existingCodes: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

const EMPTY: MachineInput = {
  name: '', machineCode: '', type: '', operator: '', site: '', inMaintenance: false, totalLifetimeHours: 0,
};

export default function MachineFormModal({ machine, projectId, existingCodes, onClose, onSaved }: Props) {
  const [form, setForm] = useState<MachineInput>(() => machine ? {
    name: machine.name,
    machineCode: machine.machineId,
    type: machine.type,
    operator: machine.operator,
    site: machine.site,
    inMaintenance: machine.status === 'maintenance',
    totalLifetimeHours: machine.totalLifetimeHours,
  } : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const set = <K extends keyof MachineInput>(key: K, value: MachineInput[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Machine name is required';
    const code = form.machineCode.trim();
    if (!code) e.machineCode = 'Machine ID is required';
    else if (
      code.toLowerCase() !== machine?.machineId.toLowerCase()
      && existingCodes.some(c => c.toLowerCase() === code.toLowerCase())
    ) e.machineCode = 'Another machine in this project already uses this ID';
    if (Number.isNaN(form.totalLifetimeHours) || form.totalLifetimeHours < 0) e.totalLifetimeHours = 'Must be 0 or more';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !validate()) return;
    setSaving(true);
    setSaveError('');
    const error = await saveMachine(form, machine, projectId);
    setSaving(false);
    if (error) { setSaveError(error); return; }
    onSaved(machine ? `${form.name} updated` : `${form.name} added to this project`);
  };

  const inputCls = (field: string) =>
    `w-full px-3 py-2 text-sm bg-input border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 ${errors[field] ? 'border-danger' : 'border-border'}`;
  const labelCls = 'block text-xs font-600 text-foreground mb-1.5';

  return (
    <Modal
      open
      onClose={onClose}
      title={machine ? 'Edit Machine' : 'Add Machine'}
      subtitle={machine ? `Editing ${machine.name}` : 'Register a machine in the current project'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Machine Name <span className="text-danger">*</span></label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={inputCls('name')} placeholder="e.g. Excavator EC210" />
            {errors.name && <p className="text-2xs text-danger mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className={labelCls}>Machine ID <span className="text-danger">*</span></label>
            <input type="text" value={form.machineCode} onChange={e => set('machineCode', e.target.value)} className={inputCls('machineCode')} placeholder="e.g. EX-015" />
            {errors.machineCode && <p className="text-2xs text-danger mt-1">{errors.machineCode}</p>}
            {machine && form.machineCode.trim() && form.machineCode.trim() !== machine.machineId && !errors.machineCode && (
              <p className="text-2xs text-muted-foreground mt-1">Existing work and maintenance records will be moved to the new ID.</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Machine Type</label>
            <input type="text" list="machine-form-types" value={form.type} onChange={e => set('type', e.target.value)} className={inputCls('type')} placeholder="e.g. Excavator" />
            <datalist id="machine-form-types">
              {MACHINE_TYPES.map(t => <option key={`mft-${t}`} value={t} />)}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Total Lifetime Hours</label>
            <input
              type="number" min={0} step="0.1" value={form.totalLifetimeHours}
              onChange={e => set('totalLifetimeHours', Number(e.target.value))}
              className={inputCls('totalLifetimeHours')}
            />
            {errors.totalLifetimeHours
              ? <p className="text-2xs text-danger mt-1">{errors.totalLifetimeHours}</p>
              : <p className="text-2xs text-muted-foreground mt-1">Hour-meter reading. Maintenance countdowns use this.</p>}
          </div>
          <div>
            <label className={labelCls}>Operator</label>
            <input type="text" value={form.operator} onChange={e => set('operator', e.target.value)} className={inputCls('operator')} placeholder="e.g. Ramesh Kumar" />
          </div>
          <div>
            <label className={labelCls}>Site / Location</label>
            <input type="text" value={form.site} onChange={e => set('site', e.target.value)} className={inputCls('site')} placeholder="e.g. Block-7 Foundation" />
          </div>
        </div>

        <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
          <input
            type="checkbox" checked={form.inMaintenance}
            onChange={e => set('inMaintenance', e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-primary"
          />
          <span>
            <span className="block text-sm font-600 text-foreground">Out of service (in maintenance)</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Otherwise Working / Idle / Completed is worked out from today&apos;s work records.
            </span>
          </span>
        </label>

        {saveError && <p className="text-sm text-danger">{saveError}</p>}

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary px-4 py-2 rounded-lg text-sm font-600">
            Cancel
          </button>
          <button type="submit" disabled={saving || !projectId} className="btn-primary px-4 py-2 rounded-lg text-sm font-600">
            {saving ? 'Saving…' : machine ? 'Save Changes' : 'Add Machine'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
