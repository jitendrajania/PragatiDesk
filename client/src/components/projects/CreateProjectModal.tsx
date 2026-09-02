import React, { useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { X, FolderPlus, AlertCircle, CheckCircle2, Building, Layers, ShieldCheck } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !projectCode.trim()) {
      setError('Project Name and Project Code are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createProject({
        name: name.trim(),
        projectCode: projectCode.toUpperCase().trim(),
        description: description.trim() || undefined,
        officeId: user?.officeId || undefined,
      });

      const successText = `Project [${projectCode.toUpperCase().trim()}] initialized successfully!`;
      setSuccessMessage(successText);
      showSuccess(successText, 'Project Created');

      setName('');
      setProjectCode('');
      setDescription('');
      onProjectCreated();
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 700);
    } catch (err: any) {
      const msg = err.message || 'Failed to create project';
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Create New Section/Group Head / Project</h2>
              <p className="text-xs text-slate-500">Section/Group Head Project Initialization</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Office & Section Context Indicator */}
          <div className="p-3 bg-brand-50/70 border border-brand-200/80 rounded-xl space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-brand-900">
              <Layers className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>Section/Group Head: <span className="text-brand-700">{user?.sectionName || 'State IT & Communication Wing'}</span></span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 pl-6">
              <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>Office: <span className="font-medium text-slate-800">{user?.officeName || 'DoIT&C Secretariat, Jaipur (HQ)'}</span></span>
            </div>
            <div className="text-[10px] text-slate-500 pl-6 flex items-center gap-1.5 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Project Lead (Section/Group Head): <span className="font-semibold text-slate-800">{user?.name}</span> ({user?.designation} • {user?.ssoId})</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Project Identifier Code <span className="text-red-500">* (Prefix for tasks)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. PRG-PORTAL, DESK, EGOV"
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
              className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Section/Group Head / Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Citizen Service Revamp 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description / Objectives
            </label>
            <textarea
              rows={3}
              placeholder="Enter project scope, target outcomes, or departments involved..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Create Section / Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
