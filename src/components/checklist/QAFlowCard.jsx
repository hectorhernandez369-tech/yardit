import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Circle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QA_FILE_REVISIONS } from './qaChecklistData';

const emptyItem = {
  checked: false,
  result: 'untested',
  notes: '',
  screenshotOptional: false,
  testedBy: '',
  testedDate: ''
};

export function getFlowFileSnapshot(flow) {
  return flow.relatedFiles.reduce((acc, file) => {
    acc[file] = QA_FILE_REVISIONS[file] || 'untracked';
    return acc;
  }, {});
}

export function getRetestInfo(flow, approval) {
  if (!approval?.approved) return { needsRetest: false, changedFiles: [] };

  const approvedRevisions = approval.fileRevisions || {};
  const changedFiles = flow.relatedFiles.filter((file) => approvedRevisions[file] !== (QA_FILE_REVISIONS[file] || 'untracked'));
  const versionChanged = approval.version !== flow.version;

  return {
    needsRetest: versionChanged || changedFiles.length > 0,
    changedFiles: versionChanged ? ['Flow checklist version changed', ...changedFiles] : changedFiles
  };
}

export default function QAFlowCard({ flow, values, approval, onItemChange, onApprove }) {
  const [open, setOpen] = useState(false);
  const [approvedBy, setApprovedBy] = useState(approval?.approvedBy || '');
  const retestInfo = useMemo(() => getRetestInfo(flow, approval), [flow, approval]);
  const completed = flow.items.filter((item) => values[item.id]?.checked).length;
  const passed = flow.items.filter((item) => values[item.id]?.result === 'pass').length;
  const failed = flow.items.filter((item) => values[item.id]?.result === 'fail').length;
  const canApprove = passed === flow.items.length && failed === 0 && approvedBy.trim();

  return (
    <div className="rounded-xl border-2 border-[#5DADA5] bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full p-4 text-left hover:bg-[#F3E6CF]/70 transition-colors"
      >
        <div className="flex items-start gap-3">
          {open ? <ChevronDown className="w-5 h-5 text-[#2C4F4E] mt-1" /> : <ChevronRight className="w-5 h-5 text-[#2C4F4E] mt-1" />}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wide text-[#5DADA5]">{flow.category}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">v{flow.version}</span>
              {approval?.approved && !retestInfo.needsRetest && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Approved</span>
              )}
              {retestInfo.needsRetest && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Needs Retest</span>
              )}
            </div>
            <h2 className="text-lg font-bold text-[#2C4F4E]">{flow.name}</h2>
            <p className="text-sm text-slate-600">{completed}/{flow.items.length} checked · {passed} pass · {failed} fail</p>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-200 p-4 space-y-4">
          {retestInfo.needsRetest && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-bold"><AlertCircle className="w-4 h-4" /> Needs Retest</div>
              <p className="mt-1">Potentially affected flow: {flow.name}</p>
              <ul className="mt-2 list-disc pl-5">
                {retestInfo.changedFiles.map((file) => <li key={file}>Changed file: {file}</li>)}
              </ul>
            </div>
          )}

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-700 mb-2">Related Files</p>
            <div className="flex flex-wrap gap-2">
              {flow.relatedFiles.map((file) => (
                <span key={file} className="rounded-full bg-white border border-slate-200 px-2 py-1 text-xs text-slate-600">{file}</span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {flow.items.map((item, index) => {
              const itemValue = values[item.id] || emptyItem;
              return (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onItemChange(item.id, { checked: !itemValue.checked })}
                      className="mt-0.5"
                      aria-label={`Toggle ${item.label}`}
                    >
                      {itemValue.checked ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-slate-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800"><span className="text-slate-400 mr-1">{index + 1}.</span>{item.label}</p>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={itemValue.result === 'pass' ? 'default' : 'outline'}
                            onClick={() => onItemChange(item.id, { result: 'pass', checked: true })}
                            className={itemValue.result === 'pass' ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            Pass
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={itemValue.result === 'fail' ? 'destructive' : 'outline'}
                            onClick={() => onItemChange(item.id, { result: 'fail', checked: true })}
                          >
                            Fail
                          </Button>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={!!itemValue.screenshotOptional}
                            onChange={(event) => onItemChange(item.id, { screenshotOptional: event.target.checked })}
                          />
                          Screenshot Optional
                        </label>
                        <Input
                          value={itemValue.testedBy || ''}
                          onChange={(event) => onItemChange(item.id, { testedBy: event.target.value })}
                          placeholder="Tested By"
                        />
                        <Input
                          type="date"
                          value={itemValue.testedDate || ''}
                          onChange={(event) => onItemChange(item.id, { testedDate: event.target.value })}
                        />
                        <Textarea
                          value={itemValue.notes || ''}
                          onChange={(event) => onItemChange(item.id, { notes: event.target.value })}
                          placeholder="Notes"
                          className="md:col-span-2 min-h-20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-[#2C4F4E] bg-[#E7D7B8] p-4">
            <div className="flex items-center gap-2 font-bold text-[#2C4F4E] mb-3"><ShieldCheck className="w-5 h-5" /> Approve Flow</div>
            {approval?.approved && (
              <div className="mb-3 text-sm text-[#2C4F4E]">
                Approved by <strong>{approval.approvedBy}</strong> on <strong>{approval.approvedDate}</strong> · Saved version <strong>{approval.version}</strong>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <Input value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} placeholder="Approved By" />
              <Button
                type="button"
                disabled={!canApprove}
                onClick={() => onApprove(flow, approvedBy)}
                className="bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] font-semibold"
              >
                Approve Flow
              </Button>
            </div>
            {!canApprove && <p className="mt-2 text-xs text-[#2C4F4E]">Every item must be marked Pass and Approved By must be filled before approval.</p>}
          </div>
        </div>
      )}
    </div>
  );
}