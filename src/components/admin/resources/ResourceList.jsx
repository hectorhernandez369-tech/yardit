import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Search, Clock, CheckCircle2, Circle, BookOpen, Image as ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";

const normalize = (value) => String(value || "").toLowerCase();
const isCurrentProgress = (progress, lesson) => progress?.completed && Number(progress.version_number || 1) === Number(lesson.version_number || 1);

function canAccessResources(user) {
  const role = normalize(user?.role || user?.role_label);
  return !!user?.isAdmin || ["admin", "developer", "owner", "master", "super_master"].includes(role);
}

function LessonBody({ lesson }) {
  const faqs = Array.isArray(lesson.faq) ? lesson.faq : [];
  const knowledgeChecks = Array.isArray(lesson.knowledge_checks) ? lesson.knowledge_checks : [];
  const images = Array.isArray(lesson.image_urls) ? lesson.image_urls : [];
  const videos = Array.isArray(lesson.video_urls) ? lesson.video_urls : [];

  return (
    <div className="space-y-4 text-sm text-slate-700">
      {lesson.golden_rule && (
        <section className="rounded-lg border-2 border-[#F4A849] bg-[#FFF7E8] p-3">
          <h4 className="font-bold text-[#2C4F4E] mb-1">Golden Rule</h4>
          <p className="leading-relaxed font-medium text-[#2C4F4E]">{lesson.golden_rule}</p>
        </section>
      )}

      {lesson.content && (
        <section className="rounded-lg border border-slate-200 bg-white p-3">
          <h4 className="font-bold text-[#2C4F4E] mb-1">Lesson</h4>
          <p className="leading-relaxed whitespace-pre-line">{lesson.content}</p>
        </section>
      )}

      {lesson.examples && (
        <section className="rounded-lg border border-[#5DADA5]/40 bg-[#F3E6CF] p-3">
          <h4 className="font-bold text-[#2C4F4E] mb-1">Examples</h4>
          <p className="leading-relaxed whitespace-pre-line">{lesson.examples}</p>
        </section>
      )}

      {lesson.teacher_notes && (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <h4 className="font-bold text-blue-900 mb-1">Teacher Notes</h4>
          <p className="leading-relaxed whitespace-pre-line text-blue-950">{lesson.teacher_notes}</p>
        </section>
      )}

      {lesson.behind_the_scenes && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <h4 className="font-bold text-amber-900 mb-1">Behind The Scenes</h4>
          <p className="leading-relaxed whitespace-pre-line text-amber-950">{lesson.behind_the_scenes}</p>
        </section>
      )}

      {knowledgeChecks.length > 0 && (
        <section className="rounded-lg border border-green-200 bg-green-50 p-3">
          <h4 className="font-bold text-green-900 mb-2">Test Your Knowledge</h4>
          <div className="space-y-2">
            {knowledgeChecks.map((item, index) => (
              <details key={`${lesson.resource_key}-check-${index}`} className="rounded-md bg-white border border-green-200 p-2">
                <summary className="cursor-pointer font-semibold text-slate-800">{item.question}</summary>
                <p className="text-slate-600 mt-2">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h4 className="font-bold text-[#2C4F4E] mb-2">FAQ</h4>
          <div className="space-y-2">
            {faqs.map((item, index) => (
              <div key={`${lesson.resource_key}-faq-${index}`} className="rounded-md bg-white border border-slate-200 p-2">
                <p className="font-semibold text-slate-800">{item.question}</p>
                <p className="text-slate-600 mt-1">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(images.length > 0 || videos.length > 0) && (
        <section className="rounded-lg border border-slate-200 bg-white p-3">
          <h4 className="font-bold text-[#2C4F4E] mb-2">Media</h4>
          <div className="space-y-2">
            {images.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#2C4F4E] underline">
                <ImageIcon className="w-4 h-4" /> Screenshot
              </a>
            ))}
            {videos.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#2C4F4E] underline">
                <Video className="w-4 h-4" /> Training video
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LessonRow({ lesson, progress, onToggle }) {
  const completed = isCurrentProgress(progress, lesson);
  const stale = progress?.completed && !completed;

  return (
    <AccordionItem value={lesson.resource_key} className="rounded-xl border border-slate-200 bg-white px-3">
      <div className="flex items-start gap-3 py-3">
        <Checkbox
          checked={completed}
          onCheckedChange={() => onToggle(lesson, !completed, progress)}
          className="mt-1 border-[#2C4F4E] data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
          aria-label={`Mark ${lesson.title} complete`}
        />
        <div className="flex-1 min-w-0">
          <AccordionTrigger className="py-0 hover:no-underline">
            <div className="text-left min-w-0 pr-3">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`font-semibold ${completed ? "text-green-800" : "text-slate-800"}`}>{lesson.title}</span>
                {completed && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                {stale && <Badge className="bg-amber-100 text-amber-800 border-amber-300">Updated</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Estimated Time: {lesson.estimated_minutes || 3} minutes</span>
                <span>v{lesson.version_number || 1}</span>
                {lesson.category && <span>{lesson.category}</span>}
              </div>
            </div>
          </AccordionTrigger>
        </div>
      </div>
      <AccordionContent className="pl-8 sm:pl-10 pb-4">
        <LessonBody lesson={lesson} />
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={() => onToggle(lesson, !completed, progress)}
            className={completed ? "bg-slate-700 hover:bg-slate-800" : "bg-[#5DADA5] hover:bg-[#4b9a93]"}
          >
            {completed ? "Mark Not Complete" : "Mark Lesson Complete"}
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function ResourceList({ user }) {
  const [modules, setModules] = useState([]);
  const [progressRecords, setProgressRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("Residential Listings");

  const hasAccess = canAccessResources(user);

  const loadResources = async () => {
    if (!user?.id || !hasAccess) return;
    setLoading(true);
    const [moduleRows, progressRows] = await Promise.all([
      base44.entities.ResourceModule.list("display_order", 200),
      base44.entities.ResourceProgress.filter({ user_id: user.id }),
    ]);

    setModules(moduleRows);
    setProgressRecords(progressRows || []);
    setLoading(false);
  };

  useEffect(() => {
    loadResources();
  }, [user?.id, hasAccess]);

  const activeModules = useMemo(() => {
    return modules
      .filter((lesson) => lesson.is_active !== false)
      .sort((a, b) => (a.section || "").localeCompare(b.section || "") || (a.display_order || 0) - (b.display_order || 0));
  }, [modules]);

  const progressByKey = useMemo(() => {
    return progressRecords.reduce((map, record) => {
      map[record.resource_key] = record;
      return map;
    }, {});
  }, [progressRecords]);

  const sections = useMemo(() => {
    const unique = [...new Set(activeModules.map((lesson) => lesson.section).filter(Boolean))];
    return unique.length ? unique : ["Resources"];
  }, [activeModules]);

  useEffect(() => {
    if (sections.length && !sections.includes(selectedSection)) setSelectedSection(sections[0]);
  }, [sections, selectedSection]);

  const filteredModules = useMemo(() => {
    const query = normalize(searchQuery);
    return activeModules.filter((lesson) => {
      const inSection = searchQuery.trim() ? true : lesson.section === selectedSection;
      if (!inSection) return false;
      if (!query) return true;
      const faqText = Array.isArray(lesson.faq) ? lesson.faq.map((item) => `${item.question} ${item.answer}`).join(" ") : "";
      const haystack = normalize(`${lesson.title} ${lesson.section} ${lesson.category} ${lesson.content} ${lesson.examples} ${lesson.behind_the_scenes} ${faqText}`);
      return haystack.includes(query);
    });
  }, [activeModules, searchQuery, selectedSection]);

  const groupedModules = useMemo(() => {
    return filteredModules.reduce((groups, lesson) => {
      const section = lesson.section || "Resources";
      if (!groups[section]) groups[section] = [];
      groups[section].push(lesson);
      return groups;
    }, {});
  }, [filteredModules]);

  const statsFor = (lessons) => {
    const completed = lessons.filter((lesson) => isCurrentProgress(progressByKey[lesson.resource_key], lesson)).length;
    const total = lessons.length;
    const minutes = lessons.reduce((sum, lesson) => sum + Number(lesson.estimated_minutes || 0), 0);
    return { completed, total, minutes, percent: total ? Math.round((completed / total) * 100) : 0 };
  };

  const allStats = statsFor(activeModules);
  const selectedStats = statsFor(activeModules.filter((lesson) => lesson.section === selectedSection));

  const toggleLesson = async (lesson, completed, existingProgress) => {
    const now = new Date().toISOString();
    const payload = {
      user_id: user.id,
      resource_module_id: lesson.id,
      resource_key: lesson.resource_key,
      version_number: lesson.version_number || 1,
      completed,
      completed_at: completed ? now : null,
      last_viewed_at: now,
    };

    let saved;
    if (existingProgress?.id) {
      saved = await base44.entities.ResourceProgress.update(existingProgress.id, payload);
      setProgressRecords((records) => records.map((record) => record.id === existingProgress.id ? { ...record, ...payload } : record));
    } else {
      saved = await base44.entities.ResourceProgress.create(payload);
      setProgressRecords((records) => [...records, saved]);
    }

    toast.success(completed ? "Lesson marked complete." : "Lesson reopened.");
  };

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-[#2C4F4E]">Resources unavailable</h2>
        <p className="text-sm text-slate-600 mt-1">Resources are currently available to Admin and Developer users.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading Resources…</p>
      </div>
    );
  }

  return (
    <div className="bg-[#F3E6CF] p-4 rounded-xl">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#2C4F4E] mb-2">Yardit Residential Academy</h1>
        <p className="text-gray-700 mb-4">Learn the rules, logic, and flows outside the Vendor Dashboard well enough to teach them to someone else. Your completion progress is private and saved to your account.</p>

        <div className="grid md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg p-4 border border-[#5DADA5]"><p className="text-xs text-gray-500">Total Lessons</p><p className="text-2xl font-bold text-[#2C4F4E]">{allStats.total}</p></div>
          <div className="bg-white rounded-lg p-4 border border-green-300"><p className="text-xs text-gray-500">Completed</p><p className="text-2xl font-bold text-green-700">{allStats.completed}</p></div>
          <div className="bg-white rounded-lg p-4 border border-[#5DADA5]"><p className="text-xs text-gray-500">Total Time</p><p className="text-2xl font-bold text-[#2C4F4E]">{allStats.minutes} min</p></div>
          <div className="bg-white rounded-lg p-4 border border-[#5DADA5]"><p className="text-xs text-gray-500">Overall</p><p className="text-2xl font-bold text-[#2C4F4E]">{allStats.percent}%</p></div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Resources: Why isn't my listing visible? Address confirmation, Open vs active time..."
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        <aside className="space-y-4">
          <div className="bg-white rounded-xl border-2 border-[#5DADA5] p-3">
            <h2 className="font-bold text-[#2C4F4E] mb-3">Training Areas</h2>
            <div className="space-y-2">
              {sections.map((section) => {
                const lessons = activeModules.filter((lesson) => lesson.section === section);
                const stats = statsFor(lessons);
                return (
                  <button
                    key={section}
                    onClick={() => {
                      setSelectedSection(section);
                      setSearchQuery("");
                    }}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm ${selectedSection === section && !searchQuery ? "bg-[#5DADA5] text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-700"}`}
                  >
                    <span className="font-medium block">{section}</span>
                    <span className="text-xs opacity-80">{stats.completed}/{stats.total} complete • {stats.minutes} min</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <h2 className="font-bold text-[#2C4F4E] mb-3">Selected Progress</h2>
            <div className="space-y-2">
              <Progress value={searchQuery ? allStats.percent : selectedStats.percent} className="h-3 bg-slate-200 [&>div]:bg-[#5DADA5]" />
              <p className="text-sm text-slate-600">{searchQuery ? allStats.completed : selectedStats.completed} of {searchQuery ? allStats.total : selectedStats.total} lessons completed</p>
              <p className="text-xs text-slate-500">Resume any time. Progress saves automatically.</p>
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          {Object.keys(groupedModules).length > 0 ? (
            Object.entries(groupedModules).map(([section, lessons]) => {
              const stats = statsFor(lessons);
              return (
                <div key={section} className="bg-white rounded-xl border-2 border-[#5DADA5] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[#2C4F4E]">{section}</h2>
                      <p className="text-sm text-slate-600">Total Time: {stats.minutes} minutes • {stats.completed} of {stats.total} completed</p>
                    </div>
                    <Badge className="bg-[#F4A849] text-[#2C4F4E] border-[#2C4F4E]">{stats.percent}% Complete</Badge>
                  </div>
                  <Progress value={stats.percent} className="h-3 bg-slate-200 [&>div]:bg-[#5DADA5] mb-4" />
                  <Accordion type="multiple" className="space-y-3">
                    {lessons.map((lesson) => (
                      <LessonRow key={lesson.resource_key} lesson={lesson} progress={progressByKey[lesson.resource_key]} onToggle={toggleLesson} />
                    ))}
                  </Accordion>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <Circle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No matching lessons found.</p>
              <p className="text-sm text-slate-500">Try searching for address, visibility, open time, or support.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}