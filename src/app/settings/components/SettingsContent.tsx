'use client';
import React, { useState, useEffect } from 'react';
import { Settings, Bell, Building2, User, Save, Wrench } from 'lucide-react';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentProject } from '@/lib/ProjectContext';
import { geocodeLocation } from '@/lib/weather';
import { MapPin, X as XIcon } from 'lucide-react';

export default function SettingsContent() {
  const { currentProjectId, currentProjectName, setCurrentProject, ready } = useCurrentProject();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [projectStatus, setProjectStatus] = useState('active');
  const [weatherLocations, setWeatherLocations] = useState<{ id: string; name: string; latitude: number; longitude: number }[]>([]);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifyOverdue, setNotifyOverdue] = useState(true);
  const [notifyDueSoon, setNotifyDueSoon] = useState(true);
  const [dueSoonThreshold, setDueSoonThreshold] = useState(20);
  const [autoReset, setAutoReset] = useState(true);
  const [currency, setCurrency] = useState('PKR');
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    if (!ready) return;
    const load = async () => {
      const [{ data: settings }, { data: userData }, projectResult] = await Promise.all([
        supabase.from('app_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.auth.getUser(),
        currentProjectId
          ? supabase.from('projects').select('*').eq('id', currentProjectId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (settings) {
        setCompanyName(settings.company_name || '');
        setCurrency(settings.currency || 'PKR');
        setTimezone(settings.timezone || 'Asia/Karachi');
        setNotifyOverdue(settings.notify_overdue);
        setNotifyDueSoon(settings.notify_due_soon);
        setDueSoonThreshold(settings.due_soon_threshold ?? 20);
        setAutoReset(settings.auto_reset);
      }
      if (userData?.user) {
        setAdminEmail(userData.user.email || '');
        setAdminName((userData.user.user_metadata?.full_name as string) || '');
      }
      if (projectResult?.data) {
        setProjectName(projectResult.data.name || '');
        setProjectLocation(projectResult.data.location || '');
        setProjectStatus(projectResult.data.status || 'active');
      }
      if (currentProjectId) {
        const { data: locRows } = await supabase
          .from('project_weather_locations')
          .select('*')
          .eq('project_id', currentProjectId)
          .order('created_at', { ascending: true });
        setWeatherLocations(locRows || []);
      }
      setLoading(false);
    };
    load();
  }, [currentProjectId, ready]);

  const handleAddLocation = async () => {
    if (!newLocationInput.trim() || !currentProjectId) return;
    setAddingLocation(true);
    setLocationError('');
    const geocoded = await geocodeLocation(newLocationInput.trim());
    if (!geocoded) {
      setAddingLocation(false);
      setLocationError(`Could not find "${newLocationInput.trim()}" — try a nearby major city name instead.`);
      return;
    }
    const { data, error } = await supabase.from('project_weather_locations').insert({
      project_id: currentProjectId,
      name: geocoded.displayName,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
    }).select().single();
    setAddingLocation(false);
    if (error || !data) {
      setLocationError('Could not save this location. Please try again.');
      return;
    }
    setWeatherLocations(prev => [...prev, data]);
    setNewLocationInput('');
  };

  const handleRemoveLocation = async (id: string) => {
    await supabase.from('project_weather_locations').delete().eq('id', id);
    setWeatherLocations(prev => prev.filter(l => l.id !== id));
  };

  const handleSaveProject = async () => {
    if (!currentProjectId) return;
    if (!projectName.trim()) {
      addToast('error', 'Project name required', 'Please enter a name for this project');
      return;
    }
    setSaving('Project');
    const { error } = await supabase.from('projects').update({
      name: projectName.trim(), location: projectLocation.trim() || null, status: projectStatus,
    }).eq('id', currentProjectId);
    setSaving('');
    if (error) { addToast('error', 'Could not save', error.message); return; }
    setCurrentProject(currentProjectId, projectName.trim());
    addToast('success', 'Project updated', 'This project\'s details were saved');
  };

  const handleSaveCompany = async () => {
    setSaving('Company');
    const { error } = await supabase.from('app_settings').update({
      company_name: companyName, currency, timezone, updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving('');
    if (error) { addToast('error', 'Could not save', error.message); return; }
    addToast('success', 'Settings saved', 'Company settings updated successfully');
  };

  const handleSaveProfile = async () => {
    setSaving('Profile');
    if (newPassword && newPassword !== confirmPassword) {
      addToast('error', 'Passwords do not match', 'Check the confirm password field');
      setSaving('');
      return;
    }
    const updates: { data?: { full_name: string }; email?: string; password?: string } = { data: { full_name: adminName } };
    if (adminEmail) updates.email = adminEmail;
    if (newPassword) updates.password = newPassword;
    const { error } = await supabase.auth.updateUser(updates);
    setSaving('');
    if (error) { addToast('error', 'Could not update profile', error.message); return; }
    setNewPassword('');
    setConfirmPassword('');
    addToast('success', 'Profile updated', 'Your account details were saved');
  };

  const handleSaveNotifications = async () => {
    setSaving('Notification');
    const { error } = await supabase.from('app_settings').update({
      notify_overdue: notifyOverdue, notify_due_soon: notifyDueSoon, due_soon_threshold: dueSoonThreshold, updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving('');
    if (error) { addToast('error', 'Could not save', error.message); return; }
    addToast('success', 'Settings saved', 'Notification settings updated successfully');
  };

  const handleSaveMaintenance = async () => {
    setSaving('Maintenance');
    const { error } = await supabase.from('app_settings').update({
      auto_reset: autoReset, updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving('');
    if (error) { addToast('error', 'Could not save', error.message); return; }
    addToast('success', 'Settings saved', 'Maintenance settings updated successfully');
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${value ? 'bg-primary' : 'bg-border'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );

  const inputCls = 'w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground';

  if (loading) {
    return <div className="text-center py-16 text-sm text-muted-foreground">Loading settings…</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-card rounded-xl border border-border card-shadow">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Building2 size={16} className="text-success" />
          </div>
          <div>
            <h2 className="text-sm font-700 text-foreground">Project Information</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Only applies to {currentProjectName || 'this project'} — other projects are unaffected</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Project Name</label>
            <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">Location</label>
              <input type="text" value={projectLocation} onChange={e => setProjectLocation(e.target.value)} placeholder="e.g. Lahore, Punjab" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">Status</label>
              <select value={projectStatus} onChange={e => setProjectStatus(e.target.value)} className={inputCls}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSaveProject} disabled={saving === 'Project'} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600">
              <Save size={14} />
              {saving === 'Project' ? 'Saving…' : 'Save Project'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border card-shadow">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
            <MapPin size={16} className="text-success" />
          </div>
          <div>
            <h2 className="text-sm font-700 text-foreground">Weather Locations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Locations shown in the live weather widget on this project&apos;s dashboard</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newLocationInput}
              onChange={e => setNewLocationInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
              placeholder="e.g. Mianwali"
              className={inputCls}
            />
            <button
              onClick={handleAddLocation}
              disabled={addingLocation || !newLocationInput.trim()}
              className="btn-primary px-4 py-2 rounded-lg text-sm font-600 whitespace-nowrap disabled:opacity-60"
            >
              {addingLocation ? 'Adding…' : 'Add'}
            </button>
          </div>
          {locationError && <p className="text-xs text-danger">{locationError}</p>}

          {weatherLocations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No locations added yet — type a city name above.</p>
          ) : (
            <div className="space-y-2">
              {weatherLocations.map(loc => (
                <div key={loc.id} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <MapPin size={13} className="text-muted-foreground" />
                    {loc.name}
                  </span>
                  <button onClick={() => handleRemoveLocation(loc.id)} className="p-1 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors">
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border card-shadow">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 size={16} className="text-primary" />
          </div>
          <h2 className="text-sm font-700 text-foreground">Company Information</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">Company Name</label>
            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls}>
                <option value="PKR">PKR (Rs.)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className={inputCls}>
                <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSaveCompany} disabled={saving === 'Company'} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600">
              <Save size={14} />
              {saving === 'Company' ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border card-shadow">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-earth/10 flex items-center justify-center">
            <User size={16} className="text-earth" />
          </div>
          <h2 className="text-sm font-700 text-foreground">Admin Profile</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">Admin Name</label>
              <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">Email Address</label>
              <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSaveProfile} disabled={saving === 'Profile'} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600">
              <Save size={14} />
              {saving === 'Profile' ? 'Saving…' : 'Update Profile'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border card-shadow">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <Bell size={16} className="text-warning" />
          </div>
          <h2 className="text-sm font-700 text-foreground">Notification Rules</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-600 text-foreground">Overdue Maintenance Alerts</p>
              <p className="text-xs text-muted-foreground">Notify when machine exceeds maintenance hour limit</p>
            </div>
            <Toggle value={notifyOverdue} onChange={setNotifyOverdue} />
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-600 text-foreground">Due Soon Alerts</p>
              <p className="text-xs text-muted-foreground">Notify when maintenance is approaching the limit</p>
            </div>
            <Toggle value={notifyDueSoon} onChange={setNotifyDueSoon} />
          </div>
          {notifyDueSoon && (
            <div className="bg-muted/50 rounded-lg p-4">
              <label className="block text-xs font-600 text-foreground mb-2">Due Soon Threshold (working hours before limit)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number" min={5} max={100} value={dueSoonThreshold}
                  onChange={e => setDueSoonThreshold(Number(e.target.value))}
                  className="w-24 px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:border-primary"
                />
                <span className="text-sm text-muted-foreground">hours remaining</span>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={handleSaveNotifications} disabled={saving === 'Notification'} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600">
              <Save size={14} />
              {saving === 'Notification' ? 'Saving…' : 'Save Notifications'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border card-shadow">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Wrench size={16} className="text-success" />
          </div>
          <h2 className="text-sm font-700 text-foreground">Maintenance Tracking</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-600 text-foreground">Auto-Reset Maintenance Counter</p>
              <p className="text-xs text-muted-foreground">Automatically reset working hour counter when a new maintenance record is added</p>
            </div>
            <Toggle value={autoReset} onChange={setAutoReset} />
          </div>
          <div className="flex justify-end">
            <button onClick={handleSaveMaintenance} disabled={saving === 'Maintenance'} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600">
              <Save size={14} />
              {saving === 'Maintenance' ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}