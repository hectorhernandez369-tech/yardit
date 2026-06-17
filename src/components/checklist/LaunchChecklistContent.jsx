import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle, Download, Lock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { loadSavedLaunchChecklist, readLocalChecklist, saveLaunchChecklist } from '@/lib/launchChecklistStorage';
import { QA_CATEGORIES, QA_FLOWS } from './qaFlowData';

const emptyStep = { checked: false, result: '', notes: '', screenshot: '', testedBy: '', testedDate: '' };

const getDefaults = () => {
  const defaults = { steps: {}, approvals: {}, freezes: {} };
  QA_FLOWS.forEach(flow => {
    flow.items.forEach(item => {
      defaults.steps[item.id] = { ...emptyStep };
    });
  });
  return defaults;
};

const today = () => new Date().toISOString().split('T')[0];

function getRetestInfo(flow, approval) {
  if (!approval) return null;
  const changedFiles = [];
  if (approval.version !== flow.version) changedFiles.push(`Flow version changed from ${approval.version} to ${flow.version}`);
  const oldFiles = approval.relatedFiles || [];
  flow.relatedFiles.forEach(file => {
    if (!oldFiles.includes(file)) changedFiles.push(file);
  });
  oldFiles.forEach(file => {
    if (!flow.relatedFiles.includes(file)) changedFiles.push(`${file} removed from related files`);
  });
  return changedFiles.length ? { changedFiles, affectedFlow: flow.name } : null;
}

function StepRow({ item, value, onChange }) {
  const update = (patch) => onChange(item.id, { ...value, ...patch });
  const setResult = (result) => {
    const nextResult = value.result === result ? '' : result;
    update({ result: nextResult, checked: !!nextResult, testedDate: nextResult ? (value.testedDate || today()) : value.testedDate });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
      <div className="flex items-start gap-3">
        <button
          onClick={() => update({ checked: !value.checked, testedDate: value.testedDate || today() })}
          className="mt-0.5 text-left"
          aria-label="Toggle checklist item"
        >
          {value.checked ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-slate-400" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 leading-relaxed">{item.label}</p>
          {item.critical && <p className="mt-1 text-xs font-semibold text-red-600">Critical launch check</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button size="sm" variant={value.result === 'pass' ? 'default' : 'outline'} onClick={() => setResult('pass')}>Pass</Button>
        <Button size="sm" variant={value.result === 'fail' ? 'destructive' : 'outline'} onClick={() => setResult('fail')}>Fail</Button>
        <Input placeholder="Tested By" value={value.testedBy || ''} onChange={(e) => update({ testedBy: e.target.value })} />
        <Input type="date" value={value.testedDate || ''} onChange={(e) => update({ testedDate: e.target.value })} />
      </div>

      <Textarea placeholder="Notes" value={value.notes || ''} onChange={(e) => update({ notes: e.target.value })} className="min-h-[64px]" />
      <Input placeholder="Screenshot optional: paste filename, link, or note" value={value.screenshot || ''} onChange={(e) => update({ screenshot: e.target.value })} />
    </div>
  );
}

export default function LaunchChecklistContent({ embedded = false }) {
  const defaults = useMemo(() => getDefaults(), []);
  const [state, setState] = useState(() => readLocalChecklist(defaults));
  const [settingId, setSettingId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(QA_CATEGORIES[0]);
  const [selectedFlowId, setSelectedFlowId] = useState(QA_FLOWS[0]?.id);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [resultFilter, setResultFilter] = useState(null);
  const [approvedBy, setApprovedBy] = useState('');

  useEffect(() => {
    loadSavedLaunchChecklist(defaults).then(({ recordId, values }) => {
      setSettingId(recordId);
      setState(values);
    });
  }, [defaults]);

  const persist = (next) => {
    setState(next);
    saveLaunchChecklist(next, settingId).then((savedSettingId) => {
      if (savedSettingId && !settingId) setSettingId(savedSettingId);
    });
  };

  const updateStep = (id, value) => persist({ ...state, steps: { ...state.steps, [id]: value } });

  const selectedFlow = QA_FLOWS.find(flow => flow.id === selectedFlowId) || QA_FLOWS[0];
  const visibleFlows = QA_FLOWS.filter(flow => flow.category === selectedCategory);
  const allItems = QA_FLOWS.flatMap(flow => flow.items);
  const completedCount = allItems.filter(item => state.steps?.[item.id]?.result === 'pass').length;
  const failedCount = allItems.filter(item => state.steps?.[item.id]?.result === 'fail').length;
  const flowItems = selectedFlow?.items || [];
  const visibleFlowItems = resultFilter
    ? flowItems.filter(item => state.steps?.[item.id]?.result === resultFilter)
    : hideCompleted
      ? flowItems.filter(item => !['pass', 'fail'].includes(state.steps?.[item.id]?.result))
      : flowItems;
  const hiddenCompletedCount = flowItems.length - visibleFlowItems.length;
  const flowPassed = flowItems.filter(item => state.steps?.[item.id]?.result === 'pass').length;
  const flowFailed = flowItems.filter(item => state.steps?.[item.id]?.result === 'fail').length;
  const flowComplete = flowItems.length > 0 && flowItems.every(item => ['pass', 'fail'].includes(state.steps?.[item.id]?.result));
  const approval = state.approvals?.[selectedFlow?.id];
  const freeze = state.freezes?.[selectedFlow?.id];
  const retestInfo = selectedFlow ? getRetestInfo(selectedFlow, approval) : null;
  const progressPercent = Math.round((completedCount / allItems.length) * 100);

  const approveFlow = () => {
    if (!approvedBy.trim()) {
      toast.error('Enter Approved By before approving this flow.');
      return;
    }
    if (!flowComplete) {
      toast.error('Complete every Pass/Fail result before approving this flow.');
      return;
    }
    const next = {
      ...state,
      approvals: {
        ...state.approvals,
        [selectedFlow.id]: {
          flowName: selectedFlow.name,
          version: selectedFlow.version,
          approvedBy: approvedBy.trim(),
          approvedDate: today(),
          relatedFiles: selectedFlow.relatedFiles,
        },
      },
    };
    persist(next);
    toast.success('Flow approved and saved.');
  };

  const freezeFlow = () => {
    if (!approval || retestInfo) {
      toast.error('Approve the current flow version before freezing it.');
      return;
    }
    const next = {
      ...state,
      freezes: {
        ...state.freezes,
        [selectedFlow.id]: { frozen: true, frozenDate: today(), flowName: selectedFlow.name, version: selectedFlow.version, relatedFiles: selectedFlow.relatedFiles },
      },
    };
    persist(next);
    toast.success('Flow frozen.');
  };

  const downloadChecklist = () => {
    let content = 'YARDIT LAUNCH-GRADE QA CHECKLIST\n';
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += '='.repeat(80) + '\n\n';

    QA_FLOWS.forEach(flow => {
      const approved = state.approvals?.[flow.id];
      const retest = getRetestInfo(flow, approved);
      content += `${flow.category} > ${flow.name} v${flow.version}\n`;
      content += `Related Files: ${flow.relatedFiles.join(', ')}\n`;
      if (approved) content += `Approved By: ${approved.approvedBy} on ${approved.approvedDate}\n`;
      if (retest) content += `NEEDS RETEST: ${retest.changedFiles.join('; ')}\n`;
      flow.items.forEach(item => {
        const step = state.steps?.[item.id] || emptyStep;
        content += `[${step.checked ? 'x' : ' '}] ${step.result || 'untested'} - ${item.label}\n`;
        content += `    Tested By: ${step.testedBy || ''} | Date: ${step.testedDate || ''} | Screenshot: ${step.screenshot || ''}\n`;
        if (step.notes) content += `    Notes: ${step.notes}\n`;
      });
      content += '\n';
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yardit-qa-checklist-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('QA checklist downloaded');
  };

  return (
    <div className={embedded ? 'bg-[#F3E6CF] p-4' : 'min-h-screen bg-[#F3E6CF] p-4 sm:p-6'}>
      <div className={embedded ? 'w-full' : 'max-w-7xl mx-auto'}>
        <div className="mb-6">
          <h1 className={embedded ? 'text-2xl font-bold text-[#2C4F4E] mb-2' : 'text-3xl sm:text-4xl font-bold text-[#2C4F4E] mb-2'}>
            Yardit Launch-Grade QA Checklist
          </h1>
          <p className="text-gray-700 mb-4">
            Click-by-click user journey QA for Yardit outside Vendor Dashboard, with Pass/Fail, notes, screenshots, tester, approval, freeze, and retest tracking.
          </p>

          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg p-4 border border-[#5DADA5]"><p className="text-xs text-gray-500">Total Steps</p><p className="text-2xl font-bold text-[#2C4F4E]">{allItems.length}</p></div>
            <div className="bg-white rounded-lg p-4 border border-green-300"><p className="text-xs text-gray-500">Passed</p><p className="text-2xl font-bold text-green-700">{completedCount}</p></div>
            <div className="bg-white rounded-lg p-4 border border-red-300"><p className="text-xs text-gray-500">Failed</p><p className="text-2xl font-bold text-red-700">{failedCount}</p></div>
            <div className="bg-white rounded-lg p-4 border border-[#5DADA5]"><p className="text-xs text-gray-500">Overall</p><p className="text-2xl font-bold text-[#2C4F4E]">{progressPercent}%</p></div>
          </div>

          <Button onClick={downloadChecklist} className="bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] font-semibold gap-2">
            <Download className="w-4 h-4" /> Download QA Checklist
          </Button>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-5">
          <aside className="space-y-4">
            <div className="bg-white rounded-xl border-2 border-[#5DADA5] p-3">
              <h2 className="font-bold text-[#2C4F4E] mb-3">QA Areas</h2>
              <div className="space-y-2">
                {QA_CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSelectedFlowId(QA_FLOWS.find(flow => flow.category === category)?.id);
                    }}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm ${selectedCategory === category ? 'bg-[#5DADA5] text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <h2 className="font-bold text-[#2C4F4E] mb-3">Flows</h2>
              <div className="space-y-2 max-h-[55vh] overflow-auto pr-1">
                {visibleFlows.map(flow => {
                  const approved = state.approvals?.[flow.id];
                  const needsRetest = !!getRetestInfo(flow, approved);
                  return (
                    <button
                      key={flow.id}
                      onClick={() => setSelectedFlowId(flow.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${selectedFlowId === flow.id ? 'border-[#2C4F4E] bg-[#F3E6CF]' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      <span className="font-medium block text-slate-800">{flow.name}</span>
                      <span className="text-xs text-slate-500">v{flow.version} • {flow.items.length} steps</span>
                      {needsRetest && <span className="block text-xs font-bold text-amber-700">Needs Retest</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {selectedFlow && (
            <main className="space-y-4">
              <div className="bg-white rounded-xl border-2 border-[#5DADA5] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-2xl font-bold text-[#2C4F4E]">{selectedFlow.name}</h2>
                    <p className="text-sm text-slate-600">{selectedFlow.category} • Version {selectedFlow.version} • {flowItems.length} click-by-click QA steps</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={hideCompleted ? 'default' : 'outline'}
                      onClick={() => {
                        setResultFilter(null);
                        setHideCompleted(!hideCompleted);
                      }}
                      className={hideCompleted ? 'bg-[#2C4F4E] hover:bg-[#244241]' : ''}
                    >
                      {hideCompleted ? `Showing Open (${hiddenCompletedCount} hidden)` : 'Hide Completed'}
                    </Button>
                    <button
                      onClick={() => {
                        setHideCompleted(false);
                        setResultFilter(resultFilter === 'pass' ? null : 'pass');
                      }}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${resultFilter === 'pass' ? 'bg-green-700 text-white border-green-700' : 'bg-green-100 text-green-800 border-green-300'}`}
                    >
                      Pass {flowPassed}
                    </button>
                    <button
                      onClick={() => {
                        setHideCompleted(false);
                        setResultFilter(resultFilter === 'fail' ? null : 'fail');
                      }}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${resultFilter === 'fail' ? 'bg-red-700 text-white border-red-700' : 'bg-red-100 text-red-800 border-red-300'}`}
                    >
                      Fail {flowFailed}
                    </button>
                    {approval && !retestInfo && <Badge className="bg-blue-100 text-blue-800 border-blue-300">Approved</Badge>}
                    {freeze?.frozen && <Badge className="bg-slate-800 text-white">Frozen</Badge>}
                    {retestInfo && <Badge className="bg-amber-100 text-amber-800 border-amber-300">Needs Retest</Badge>}
                  </div>
                </div>

                {retestInfo && (
                  <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <div className="font-bold flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Flow needs retest</div>
                    <p>Potentially affected flow: {retestInfo.affectedFlow}</p>
                    <p className="font-semibold mt-2">Changed file/version:</p>
                    <ul className="list-disc pl-5">
                      {retestInfo.changedFiles.map(file => <li key={file}>{file}</li>)}
                    </ul>
                  </div>
                )}

                <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-4">
                  <summary className="cursor-pointer font-semibold text-slate-700">Related Files</summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedFlow.relatedFiles.map(file => <Badge key={file} variant="outline" className="bg-white">{file}</Badge>)}
                  </div>
                </details>

                {approval && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-4 text-sm text-blue-900">
                    <p><strong>Approved Flow Name:</strong> {approval.flowName}</p>
                    <p><strong>Version:</strong> {approval.version}</p>
                    <p><strong>Approved By:</strong> {approval.approvedBy}</p>
                    <p><strong>Approved Date:</strong> {approval.approvedDate}</p>
                  </div>
                )}

                <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
                  <Input placeholder="Approved By" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
                  <Button onClick={approveFlow} className="bg-[#5DADA5] hover:bg-[#4b9a93]">Approve Flow</Button>
                  <Button onClick={freezeFlow} variant="outline" className="gap-2"><Lock className="w-4 h-4" /> Freeze Flow</Button>
                </div>
              </div>

              <div className="space-y-3">
                {visibleFlowItems.length > 0 ? (
                  visibleFlowItems.map(item => (
                    <StepRow key={item.id} item={item} value={state.steps?.[item.id] || emptyStep} onChange={updateStep} />
                  ))
                ) : (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
                    All items in this flow are completed. Turn off Hide Completed to review them.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#2C4F4E] bg-[#E7D7B8] p-4">
                <h3 className="font-bold text-[#2C4F4E] mb-1">Flow Verdict</h3>
                {flowFailed > 0 ? (
                  <p className="text-sm text-slate-800"><AlertCircle className="inline w-4 h-4 text-red-600" /> {flowFailed} failed step(s) must be fixed or documented before launch approval.</p>
                ) : flowComplete ? (
                  <p className="text-sm text-slate-800"><CheckCircle2 className="inline w-4 h-4 text-green-700" /> All steps have results. This flow can be approved.</p>
                ) : (
                  <p className="text-sm text-slate-800"><Circle className="inline w-4 h-4 text-slate-600" /> Continue testing until every step has Pass or Fail selected.</p>
                )}
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}