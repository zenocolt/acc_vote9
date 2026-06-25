import React, { useEffect, useRef, useState } from "react";
import { 
  Vote, 
  ChartBar, 
  Lock, 
  User, 
  Plus, 
  Trash2, 
  Edit2, 
  LogOut, 
  RefreshCw, 
  Award, 
  CheckCircle2, 
  Users, 
  Check, 
  Sparkles, 
  X, 
  ChevronRight, 
  AlertCircle, 
  Crown,
  Heart,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Candidate, CandidateType, Vote as VoteType } from "./types";

export default function App() {
  type NotificationType = "success" | "error";

  // Session States
  const [studentId, setStudentId] = useState<string>(() => {
    return localStorage.getItem("vote_student_id") || "";
  });
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [votedDetails, setVotedDetails] = useState<{ starId: string; moonId: string } | null>(null);
  
  // App Core States
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  
  // Vote Selection States (Must select 1 Star and 1 Moon)
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [selectedMoonId, setSelectedMoonId] = useState<string | null>(null);
  
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<"vote" | "results" | "admin">("vote");
  
  // Admin States
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem("vote_admin_token") || null;
  });
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [auditVotes, setAuditVotes] = useState<VoteType[]>([]);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  
  // New Candidate Form State
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    number: 1,
    type: "star" as CandidateType,
    bio: "",
    imageUrl: ""
  });

  // UI Feedback States
  const [loginInput, setLoginInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);
  const notificationTimeoutRef = useRef<number | null>(null);
  const isAdminTabLocked = Boolean(studentId) && !adminToken;

  // Load Initial Candidates Data & Stats
  useEffect(() => {
    fetchCandidates();
    fetchStats();
    
    // Auto refresh stats every 15 seconds to ensure real-time updates
    const interval = setInterval(() => {
      fetchStats();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Check user vote status when studentId is updated
  useEffect(() => {
    if (studentId) {
      checkUserVoteStatus(studentId);
    } else {
      setHasVoted(false);
      setVotedDetails(null);
    }
  }, [studentId]);

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        window.clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Fetch Candidates from backend
  const fetchCandidates = async () => {
    try {
      const res = await fetch("/api/candidates");
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    }
  };

  // Fetch Stats from backend
  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.candidates);
        setTotalVotes(data.totalVotes);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  // Check Vote Status of specific student ID
  const checkUserVoteStatus = async (id: string) => {
    try {
      const res = await fetch("/api/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: id })
      });
      if (res.ok) {
        const data = await res.json();
        setHasVoted(data.hasVoted);
        setVotedDetails(data.voteDetails);
        if (data.hasVoted) {
          setActiveTab("results");
        }
      }
    } catch (err) {
      console.error("Failed to check vote status:", err);
    }
  };

  // Fetch Admin logs (Audit Trail)
  const fetchAuditLogs = async (token = adminToken) => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/votes", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditVotes(data.votes);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    }
  };

  // Handle Student Login (Student ID Entry)
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const cleanId = loginInput.trim();

    if (!cleanId) {
      setLoginError("กรุณากรอกรหัสนักศึกษา");
      return;
    }

    // Validate student ID pattern (commonly 10 or 11 digits, but allow test ids with minimum length 5)
    if (cleanId.length < 5) {
      setLoginError("รหัสนักศึกษาควรมีความยาวอย่างน้อย 5 หลัก");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: cleanId })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("vote_student_id", cleanId);
        setStudentId(cleanId);
        setHasVoted(data.hasVoted);
        setVotedDetails(data.voteDetails);
        
        showNotification("success", "เข้าสู่ระบบสำเร็จแล้ว");
        if (data.hasVoted) {
          setActiveTab("results");
        } else {
          setActiveTab("vote");
        }
      } else {
        const data = await res.json();
        setLoginError(data.error || "ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
      }
    } catch (err) {
      setLoginError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  // Logout Student
  const handleLogout = () => {
    localStorage.removeItem("vote_student_id");
    setStudentId("");
    setLoginInput("");
    setHasVoted(false);
    setVotedDetails(null);
    setSelectedStarId(null);
    setSelectedMoonId(null);
    setActiveTab("vote");
    showNotification("success", "ออกจากระบบเรียบร้อยแล้ว");
  };

  // Handle Casting the Vote (Stars & Moons)
  const handleCastVote = async () => {
    if (!studentId) {
      showNotification("error", "กรุณาเข้าสู่ระบบด้วยรหัสนักศึกษาก่อน");
      return;
    }

    if (!selectedStarId || !selectedMoonId) {
      showNotification("error", "กรุณาเลือกผู้เข้าประกวดทั้ง ดาว (Star) และ เดือน (Moon) ให้ครบถ้วน");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          starId: selectedStarId,
          moonId: selectedMoonId
        })
      });

      const data = await res.json();
      if (res.ok) {
        setHasVoted(true);
        setVotedDetails({ starId: selectedStarId, moonId: selectedMoonId });
        showNotification("success", "ส่งคะแนนโหวตของคุณสำเร็จแล้ว! ขอบคุณที่ร่วมกิจกรรม");
        fetchStats();
        setActiveTab("results");
      } else {
        showNotification("error", data.error || "เกิดข้อผิดพลาดในการส่งคะแนนโหวต");
      }
    } catch (err) {
      showNotification("error", "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  // Admin Actions: Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("vote_admin_token", data.token);
        setAdminToken(data.token);
        setAdminPassword("");
        fetchAuditLogs(data.token);
        showNotification("success", "ยินดีต้อนรับแอดมิน เข้าสู่ระบบสำเร็จ");
      } else {
        setAdminError(data.error || "รหัสผ่านไม่ถูกต้อง");
      }
    } catch (err) {
      setAdminError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  // Admin Actions: Logout
  const handleAdminLogout = () => {
    localStorage.removeItem("vote_admin_token");
    setAdminToken(null);
    setAuditVotes([]);
    showNotification("success", "ออกจากระบบแอดมินเรียบร้อย");
  };

  // Admin Actions: Add New Candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    if (!newCandidate.name || !newCandidate.imageUrl) {
      showNotification("error", "กรุณากรอกชื่อและลิงก์รูปภาพผู้ประกวด");
      return;
    }

    try {
      const res = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(newCandidate)
      });

      if (res.ok) {
        showNotification("success", "เพิ่มข้อมูลผู้สมัครเรียบร้อยแล้ว");
        fetchCandidates();
        fetchStats();
        setShowAddForm(false);
        setNewCandidate({
          name: "",
          number: candidates.filter(c => c.type === newCandidate.type).length + 2,
          type: "star",
          bio: "",
          imageUrl: ""
        });
      } else {
        const data = await res.json();
        showNotification("error", data.error || "ไม่สามารถเพิ่มข้อมูลได้");
      }
    } catch (err) {
      showNotification("error", "เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์");
    }
  };

  // Admin Actions: Edit Candidate (Save)
  const handleSaveEditCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !editingCandidate) return;

    try {
      const res = await fetch(`/api/admin/candidates/${editingCandidate.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(editingCandidate)
      });

      if (res.ok) {
        showNotification("success", "แก้ไขข้อมูลผู้สมัครสำเร็จ");
        fetchCandidates();
        fetchStats();
        setEditingCandidate(null);
      } else {
        const data = await res.json();
        showNotification("error", data.error || "ไม่สามารถแก้ไขข้อมูลได้");
      }
    } catch (err) {
      showNotification("error", "เกิดข้อผิดพลาดขณะส่งคำขอแก้ไข");
    }
  };

  // Admin Actions: Delete Candidate
  const handleDeleteCandidate = async (id: string) => {
    if (!adminToken) return;
    if (!confirm("คุณต้องการลบผู้ประกวดคนนี้จริงหรือไม่? ข้อมูลคะแนนโหวตทั้งหมดของผู้สมัครรายนี้จะสูญหายทันที")) return;

    try {
      const res = await fetch(`/api/admin/candidates/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });

      if (res.ok) {
        showNotification("success", "ลบผู้สมัครเรียบร้อยแล้ว");
        fetchCandidates();
        fetchStats();
      } else {
        const data = await res.json();
        showNotification("error", data.error || "ลบผู้เข้าประกวดล้มเหลว");
      }
    } catch (err) {
      showNotification("error", "เกิดข้อผิดพลาดขณะส่งคำขอลบ");
    }
  };

  // Admin Actions: Reset all votes
  const handleResetAllVotes = async () => {
    if (!adminToken) return;
    if (!confirm("⚠️ คำเตือนสำคัญ! คุณต้องการรีเซ็ตคะแนนโหวตและประวัติผู้ลงคะแนนทั้งหมดเป็นศูนย์หรือไม่? การกระทำนี้ไม่สามารถย้อนคืนได้!")) return;

    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });

      if (res.ok) {
        showNotification("success", "รีเซ็ตคะแนนและล้างประวัติผู้โหวตทั้งหมดเรียบร้อยแล้ว!");
        fetchCandidates();
        fetchStats();
        fetchAuditLogs();
        setSelectedStarId(null);
        setSelectedMoonId(null);
      } else {
        const data = await res.json();
        showNotification("error", data.error || "รีเซ็ตล้มเหลว");
      }
    } catch (err) {
      showNotification("error", "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  // Admin Actions: Cancel/delete specific vote
  const handleCancelVote = async (studentId: string) => {
    if (!adminToken) return;
    if (!confirm(`คุณต้องการยกเลิกและลบผลโหวตของรหัสนักศึกษา "${studentId}" จริงหรือไม่?\nคะแนนโหวตจะถูกลดลงและบันทึกประวัติจะถูกลบออกทันที`)) return;

    try {
      const res = await fetch(`/api/admin/votes/${encodeURIComponent(studentId)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });

      if (res.ok) {
        showNotification("success", `ยกเลิกคะแนนโหวตของรหัส ${studentId} เรียบร้อยแล้ว`);
        fetchCandidates();
        fetchStats();
        fetchAuditLogs();
      } else {
        const data = await res.json();
        showNotification("error", data.error || "ยกเลิกผลโหวตล้มเหลว");
      }
    } catch (err) {
      showNotification("error", "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  // Show Notification Utility
  const showNotification = (type: NotificationType, message: string) => {
    if (notificationTimeoutRef.current) {
      window.clearTimeout(notificationTimeoutRef.current);
    }

    setNotification({ type, message });
    notificationTimeoutRef.current = window.setTimeout(() => {
      setNotification(null);
      notificationTimeoutRef.current = null;
    }, 5000);
  };

  const dismissNotification = () => {
    if (notificationTimeoutRef.current) {
      window.clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setNotification(null);
  };

  const getNotificationMeta = (type: NotificationType) => {
    if (type === "success") {
      return {
        title: "สำเร็จแล้ว",
        accent: "from-emerald-500 via-green-500 to-teal-500",
        panel: "border-emerald-200/70 bg-white/95 text-emerald-950 shadow-emerald-200/70",
        iconWrap: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
        icon: <CheckCircle2 className="w-5 h-5" />,
      };
    }

    return {
      title: "กรุณาตรวจสอบ",
      accent: "from-rose-500 via-pink-500 to-orange-400",
      panel: "border-rose-200/80 bg-white/95 text-rose-950 shadow-rose-200/70",
      iconWrap: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
      icon: <AlertCircle className="w-5 h-5" />,
    };
  };

  const renderInlineNotice = (message: string, type: NotificationType = "error") => {
    const meta = getNotificationMeta(type);

    return (
      <div className={`relative overflow-hidden rounded-2xl border px-4 py-3 text-left shadow-sm ${meta.panel}`}>
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.accent}`} />
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconWrap}`}>
            {meta.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{meta.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{message}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderHighlightNotice = ({
    badge,
    title,
    description,
    icon,
    tone = "indigo",
  }: {
    badge: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    tone?: "indigo" | "slate";
  }) => {
    const toneClasses =
      tone === "slate"
        ? {
            shell: "border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-slate-300/40",
            badge: "bg-white/10 text-slate-100 border border-white/10",
            iconWrap: "bg-amber-400 text-slate-950 shadow-amber-300/40",
            glow: "bg-amber-300/20",
            text: "text-slate-300",
          }
        : {
            shell: "border-indigo-200/70 bg-gradient-to-br from-indigo-950 via-blue-900 to-cyan-900 text-white shadow-indigo-300/40",
            badge: "bg-white/12 text-cyan-100 border border-white/10",
            iconWrap: "bg-amber-300 text-indigo-950 shadow-amber-200/40",
            glow: "bg-cyan-300/20",
            text: "text-blue-100/85",
          };

    return (
      <div className={`relative overflow-hidden rounded-[28px] border p-5 shadow-xl ${toneClasses.shell}`}>
        <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl ${toneClasses.glow}`} />
        <div className="relative flex items-start gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg ${toneClasses.iconWrap}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] ${toneClasses.badge}`}>
              {badge}
            </span>
            <h3 className="mt-3 text-lg font-black leading-tight md:text-xl">{title}</h3>
            <p className={`mt-2 max-w-3xl text-sm leading-6 ${toneClasses.text}`}>{description}</p>
          </div>
        </div>
      </div>
    );
  };

  // Fetch admin logs when tab changes to admin and already logged in
  useEffect(() => {
    if (activeTab === "admin" && adminToken) {
      fetchAuditLogs();
    }
  }, [activeTab, adminToken]);

  // Helpers to get specific candidate name
  const getCandidateName = (id: string) => {
    const found = candidates.find(c => c.id === id);
    return found ? found.name : "ไม่ทราบข้อมูล";
  };

  // Identify Current Leader (Star & Moon with maximum votes)
  const getLeader = (type: CandidateType) => {
    const candidatesOfType = stats.filter(c => c.type === type);
    if (candidatesOfType.length === 0) return null;
    
    // Sort descending by votes
    const sorted = [...candidatesOfType].sort((a, b) => b.votesCount - a.votesCount);
    // Return the top one if they have at least 1 vote
    return sorted[0].votesCount > 0 ? sorted[0].id : null;
  };

  const starLeaderId = getLeader("star");
  const moonLeaderId = getLeader("moon");

  // Helper to render candidate image or emoji beautifully
  const renderCandidateAvatar = (imageUrl: string, type: CandidateType, sizeClass: string = "w-10 h-10 text-xl") => {
    const url = imageUrl || "";
    const isEmoji = url && !url.startsWith("http") && url.length <= 8;
    if (isEmoji) {
      return (
        <div className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 shadow-sm border select-none ${
          type === "star" 
            ? "bg-gradient-to-br from-pink-100 to-rose-200 text-pink-600 border-pink-200" 
            : "bg-gradient-to-br from-sky-100 to-blue-200 text-sky-600 border-sky-200"
        }`}>
          {url}
        </div>
      );
    } else {
      return (
        <img
          src={url || (type === "star" ? "👸" : "🤴")}
          alt=""
          referrerPolicy="no-referrer"
          className={`${sizeClass} rounded-full object-cover border shrink-0 ${
            type === "star" ? "border-pink-200" : "border-sky-200"
          }`}
        />
      );
    }
  };

  const renderLargeCandidateAvatar = (cand: Candidate) => {
    const url = cand.imageUrl || "";
    const isEmoji = url && !url.startsWith("http") && url.length <= 8;
    if (isEmoji) {
      return (
        <div className={`aspect-[4/5] w-full bg-gradient-to-b relative overflow-hidden flex flex-col items-center justify-center select-none ${
          cand.type === "star"
            ? "from-pink-50 via-rose-100 to-pink-200 text-pink-500"
            : "from-sky-50 via-blue-100 to-sky-200 text-sky-500"
        }`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/40 rounded-full blur-xl animate-pulse" />
          <div className="text-8xl relative z-10 filter drop-shadow-md transform group-hover:scale-110 transition duration-300">
            {url}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 p-4 text-white text-left z-10">
            <p className={`text-xs font-semibold tracking-wider ${cand.type === "star" ? "text-pink-300" : "text-sky-300"}`}>
              {cand.type === "star" ? "ดาวบัญชี" : "เดือนบัญชี"}
            </p>
            <h4 className="font-bold text-base leading-tight mt-0.5">{cand.name}</h4>
          </div>
        </div>
      );
    } else {
      return (
        <div className="aspect-[4/5] bg-slate-100 overflow-hidden relative">
          <img
            src={url || (cand.type === "star" ? "👸" : "🤴")}
            alt={cand.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-4 text-white text-left">
            <p className={`text-xs font-semibold tracking-wider ${cand.type === "star" ? "text-pink-300" : "text-sky-300"}`}>
              {cand.type === "star" ? "ดาวบัญชี" : "เดือนบัญชี"}
            </p>
            <h4 className="font-bold text-base leading-tight mt-0.5">{cand.name}</h4>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.96 }}
            id="toast-notification"
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
          >
            {(() => {
              const meta = getNotificationMeta(notification.type);

              return (
                <div className={`relative w-full max-w-lg overflow-hidden rounded-[28px] border p-1 shadow-2xl backdrop-blur-xl ${meta.panel}`}>
                  <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${meta.accent}`} />
                  <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/60 blur-3xl" />
                  <div className="relative flex items-start gap-3 rounded-[24px] bg-white/80 px-4 py-4 md:px-5">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.iconWrap}`}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{meta.title}</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{notification.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={dismissNotification}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-400 transition hover:text-slate-700"
                      aria-label="ปิดการแจ้งเตือน"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <motion.div
                    key={notification.message}
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: 5, ease: "linear" }}
                    className={`origin-left h-1 bg-gradient-to-r ${meta.accent}`}
                  />
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Premium Navigation Header */}
      <header id="main-header" className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-amber-400 p-2 rounded-xl text-indigo-950 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide">
                ดาว-เดือน บัญชีเทคนิคจันท์ 🌟
              </h1>
              <p className="text-xs text-blue-200/90 font-light flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 inline" /> แผนกการบัญชี วิทยาลัยเทคนิคจันทบุรี
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {studentId && (
              <div className="flex items-center gap-2 bg-blue-950/80 px-3 py-1.5 rounded-full border border-blue-800 text-xs">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                <span className="text-blue-100 font-mono">รหัสผู้โหวต: {studentId}</span>
                <button 
                  onClick={handleLogout} 
                  className="text-slate-400 hover:text-rose-400 transition ml-1"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Selector Nav */}
        <div className="bg-slate-900/60 border-t border-indigo-950 px-4">
          <div className="max-w-5xl mx-auto flex justify-around">
            <button
              onClick={() => setActiveTab("vote")}
              className={`flex items-center gap-1.5 py-3 px-4 text-sm font-medium transition-all relative border-b-2 ${
                activeTab === "vote"
                  ? "text-amber-400 border-amber-400 font-semibold"
                  : "text-slate-300 border-transparent hover:text-white"
              }`}
            >
              <Vote className="w-4 h-4" />
              <span>โหวตดาว-เดือน</span>
              {!hasVoted && studentId && (
                <span className="absolute top-2 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </button>
            
            <button
              onClick={() => {
                fetchStats();
                setActiveTab("results");
              }}
              className={`flex items-center gap-1.5 py-3 px-4 text-sm font-medium transition-all border-b-2 ${
                activeTab === "results"
                  ? "text-amber-400 border-amber-400 font-semibold"
                  : "text-slate-300 border-transparent hover:text-white"
              }`}
            >
              <ChartBar className="w-4 h-4" />
              <span>ผลโหวตเรียลไทม์</span>
            </button>

            <button
              onClick={() => {
                if (isAdminTabLocked) {
                  showNotification("error", "กำลังอยู่ในโหมดนักศึกษา กรุณาออกจากระบบนักศึกษาก่อนเข้าแอดมิน");
                  return;
                }
                setActiveTab("admin");
              }}
              disabled={isAdminTabLocked}
              title={isAdminTabLocked ? "ออกจากระบบนักศึกษาก่อนเข้าแอดมิน" : "เข้าสู่โหมดแอดมิน"}
              className={`flex items-center gap-1.5 py-3 px-4 text-sm font-medium transition-all border-b-2 ${
                activeTab === "admin"
                  ? "text-amber-400 border-amber-400 font-semibold"
                  : "text-slate-300 border-transparent hover:text-white"
              } ${
                isAdminTabLocked ? "cursor-not-allowed opacity-50 hover:text-slate-300" : ""
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>แอดมิน</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:py-6">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: VOTE SYSTEM */}
          {activeTab === "vote" && (
            <motion.div
              key="vote-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Login Check Shield */}
              {!studentId ? (
                <div id="login-container" className="max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mt-6">
                  <div className="p-8 text-center bg-gradient-to-b from-indigo-50 to-white">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md mb-4 rotate-3 hover:rotate-0 transition-transform">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">เข้าสู่ระบบก่อนร่วมโหวต</h2>
                    <p className="text-sm text-slate-500 mt-2">
                      กรุณากรอกรหัสนักศึกษาของคุณเพื่อยืนยันตัวตนและการจำกัดสิทธิ์โหวต 1 สิทธิ์ต่อ 1 คน เพื่อความโปร่งใส
                    </p>
                    
                    <form onSubmit={handleStudentLogin} className="mt-6 space-y-4">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <User className="w-5 h-5" />
                        </span>
                        <input
                          type="text"
                          value={loginInput}
                          onChange={(e) => setLoginInput(e.target.value)}
                          placeholder="กรอกรหัสนักศึกษา (เช่น 6632010001)"
                          className="w-full pl-10 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono text-center tracking-wider placeholder:font-sans transition-all text-slate-800"
                        />
                      </div>

                      {loginError && renderInlineNotice(loginError)}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-800 to-indigo-700 hover:from-blue-700 hover:to-indigo-600 text-white font-medium py-3.5 px-4 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>กดเริ่มโหวต</span>
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-slate-400">
                      🔒 ข้อมูลรหัสนักศึกษาใช้เพื่อตรวจสอบสิทธิ์การโหวตครั้งเดียวเท่านั้น คะแนนโหวตจะถูกเก็บไว้เป็นความลับสูงสุดของระบบหลังบ้าน
                    </div>
                  </div>
                </div>
              ) : hasVoted ? (
                /* Already Voted User View */
                <div id="already-voted-view" className="max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden text-center p-8 space-y-6 mt-6">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-800">โหวตสำเร็จแล้ว!</h2>
                    <p className="text-sm text-slate-500">
                      คุณได้ใช้สิทธิ์การโหวตประจำปีของแผนกการบัญชีเรียบร้อยแล้ว ยินดีด้วยที่ได้มีส่วนร่วมในการโหวตดาว-เดือน
                    </p>
                  </div>

                  {votedDetails && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2.5 text-sm">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">บันทึกสิทธิ์โหวตของคุณ:</div>
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-slate-100/50">
                        <span className="text-slate-500 flex items-center gap-1">🌟 โหวตดาว:</span>
                        <span className="font-semibold text-slate-800">{getCandidateName(votedDetails.starId)}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-slate-100/50">
                        <span className="text-slate-500 flex items-center gap-1">🌙 โหวตเดือน:</span>
                        <span className="font-semibold text-slate-800">{getCandidateName(votedDetails.moonId)}</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        fetchStats();
                        setActiveTab("results");
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ChartBar className="w-4 h-4" />
                      <span>ดูคะแนนสดเรียลไทม์</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Casting Vote Session */
                <div id="voting-wizard-container" className="space-y-8">
                  
                  {/* Voting Banner Instructions */}
                  <div className="bg-gradient-to-r from-amber-50 via-indigo-50/50 to-sky-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-slate-800 font-bold flex items-center gap-1.5 text-base">
                        <Sparkles className="w-5 h-5 text-amber-500" /> ขั้นตอนการลงคะแนน
                      </h3>
                      <p className="text-xs text-slate-600">
                        1 คนมีเพียง 1 สิทธิ์ และ **ต้องเลือกผู้เข้าประกวด 1 ดาว และ 1 เดือน** จึงจะสามารถบันทึกและส่งคะแนนโหวตได้
                      </p>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 ${
                        selectedStarId ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-900"
                      }`}>
                        <Heart className="w-3.5 h-3.5 fill-current" />
                        <span>ดาว: {selectedStarId ? "เลือกแล้ว ✓" : "ยังไม่ได้เลือก"}</span>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 ${
                        selectedMoonId ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-900"
                      }`}>
                        <Award className="w-3.5 h-3.5" />
                        <span>เดือน: {selectedMoonId ? "เลือกแล้ว ✓" : "ยังไม่ได้เลือก"}</span>
                      </div>
                    </div>
                  </div>

                  {/* CATEGORY 1: STARS (ดาว) */}
                  <div id="star-category-section" className="space-y-4">
                    <div className="border-b-2 border-pink-100 pb-2 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-3 h-7 bg-pink-500 rounded-md block" />
                        <span>ผู้เข้าประกวด "ดาวประจำแผนกบัญชี" (Star candidates) 🌟</span>
                      </h2>
                      <span className="text-xs font-medium text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-100">
                        เลือกโหวตได้ 1 คน
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {candidates.filter(c => c.type === "star").length === 0 ? (
                        <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                          ไม่มีข้อมูลผู้สมัครดาวในขณะนี้
                        </div>
                      ) : (
                        candidates.filter(c => c.type === "star").map((cand) => {
                          const isSelected = selectedStarId === cand.id;
                          return (
                            <div
                              key={cand.id}
                              onClick={() => setSelectedStarId(cand.id)}
                              className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden cursor-pointer hover:shadow-md transition-all relative flex flex-col group ${
                                isSelected 
                                  ? "border-pink-500 ring-2 ring-pink-500/20 scale-[1.01]" 
                                  : "border-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {/* Selection overlay badge */}
                              {isSelected && (
                                <div className="absolute top-3 right-3 z-10 bg-pink-500 text-white p-1.5 rounded-full shadow-md animate-bounce">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                              )}

                              {/* Number Badge */}
                              <div className="absolute top-3 left-3 z-10 bg-black/75 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md">
                                หมายเลข {cand.number < 10 ? `0${cand.number}` : cand.number}
                              </div>

                              {/* Candidate Image */}
                              {renderLargeCandidateAvatar(cand)}

                              {/* Bio Description */}
                              <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white">
                                <p className="text-xs text-slate-500 leading-relaxed italic">
                                  "{cand.bio || "ไม่มีข้อมูลประวัติผู้สมัคร"}"
                                </p>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStarId(cand.id);
                                  }}
                                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold text-center transition-all ${
                                    isSelected
                                      ? "bg-pink-500 text-white shadow-inner"
                                      : "bg-pink-50 hover:bg-pink-100 text-pink-700"
                                  }`}
                                >
                                  {isSelected ? "เลือกแล้ว ✓" : "กดเลือกผู้สมัครคนนี้"}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* CATEGORY 2: MOONS (เดือน) */}
                  <div id="moon-category-section" className="space-y-4 pt-4">
                    <div className="border-b-2 border-sky-100 pb-2 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-3 h-7 bg-sky-500 rounded-md block" />
                        <span>ผู้เข้าประกวด "เดือนประจำแผนกบัญชี" (Moon candidates) 🌙</span>
                      </h2>
                      <span className="text-xs font-medium text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                        เลือกโหวตได้ 1 คน
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {candidates.filter(c => c.type === "moon").length === 0 ? (
                        <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                          ไม่มีข้อมูลผู้สมัครเดือนในขณะนี้
                        </div>
                      ) : (
                        candidates.filter(c => c.type === "moon").map((cand) => {
                          const isSelected = selectedMoonId === cand.id;
                          return (
                            <div
                              key={cand.id}
                              onClick={() => setSelectedMoonId(cand.id)}
                              className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden cursor-pointer hover:shadow-md transition-all relative flex flex-col group ${
                                isSelected 
                                  ? "border-sky-500 ring-2 ring-sky-500/20 scale-[1.01]" 
                                  : "border-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {/* Selection overlay badge */}
                              {isSelected && (
                                <div className="absolute top-3 right-3 z-10 bg-sky-500 text-white p-1.5 rounded-full shadow-md animate-bounce">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                              )}

                              {/* Number Badge */}
                              <div className="absolute top-3 left-3 z-10 bg-black/75 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md">
                                หมายเลข {cand.number < 10 ? `0${cand.number}` : cand.number}
                              </div>

                              {/* Candidate Image */}
                              {renderLargeCandidateAvatar(cand)}

                              {/* Bio Description */}
                              <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white">
                                <p className="text-xs text-slate-500 leading-relaxed italic">
                                  "{cand.bio || "ไม่มีข้อมูลประวัติผู้สมัคร"}"
                                </p>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMoonId(cand.id);
                                  }}
                                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold text-center transition-all ${
                                    isSelected
                                      ? "bg-sky-500 text-white shadow-inner"
                                      : "bg-sky-50 hover:bg-sky-100 text-sky-700"
                                  }`}
                                >
                                  {isSelected ? "เลือกแล้ว ✓" : "กดเลือกผู้สมัครคนนี้"}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Sticky Voting Submission Drawer at bottom */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-semibold text-slate-700">ตรวจสอบความถูกต้องก่อนส่งคะแนน</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedStarId ? "✓ เลือกดาวแล้ว" : "ยังขาดการเลือกดาว"} และ {selectedMoonId ? "✓ เลือกเดือนแล้ว" : "ยังขาดการเลือกเดือน"}
                      </p>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleCastVote}
                        disabled={!selectedStarId || !selectedMoonId || isLoading}
                        className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-700 to-blue-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer flex items-center justify-center gap-2 text-sm"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Vote className="w-4 h-4" />
                            <span>ส่งคะแนนโหวต (Confirm Vote)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: REAL-TIME RESULTS */}
          {activeTab === "results" && (
            <motion.div
              key="results-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Header summary of results */}
              <div className="bg-gradient-to-br from-indigo-900 to-blue-950 p-6 text-white rounded-3xl shadow-lg border border-indigo-950 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl -mr-20 -mt-20" />
                
                <div className="space-y-2 text-center md:text-left z-10">
                  <span className="bg-amber-400 text-indigo-950 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                    Live Real-Time
                  </span>
                  <h2 className="text-2xl font-black">ผลคะแนนโหวต</h2>
                  <p className="text-xs text-blue-200">
                    อัพเดทคะแนนโหวตเรียลไทม์ทุก 15 วินาที 
                  </p>
                </div>

                <div className="flex gap-4 items-center shrink-0 z-10">
                  <div className="bg-white/10 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl text-center">
                    <p className="text-xs text-blue-200 font-medium">ยอดผู้โหวตทั้งหมด</p>
                    <p className="text-3xl font-black text-amber-400 tracking-wide mt-1">{totalVotes}</p>
                    <p className="text-[10px] text-blue-300">คะแนนเสียงบริสุทธิ์</p>
                  </div>

                  <button
                    onClick={() => {
                      fetchStats();
                      showNotification("success", "อัพเดทคะแนนสดล่าสุดเรียบร้อยแล้ว");
                    }}
                    className="p-3 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/15 rounded-2xl transition-all cursor-pointer flex items-center justify-center"
                    title="รีเฟรชสถิติ"
                  >
                    <RefreshCw className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {renderHighlightNotice({
                badge: "ผลโหวตโปร่งใสแน่นอน",
                title: "ข้อมูลชุดนี้อัปเดตเพื่อยืนยันความยุติธรรมของการโหวตแบบเห็นภาพทันที",
                description:
                  totalVotes > 0
                    ? `ขณะนี้มีผู้ใช้สิทธิ์แล้ว ${totalVotes} คน และระบบแสดงผลโดยอิงจากคะแนนจริงในฐานข้อมูลแบบเรียลไทม์ เพื่อให้ผู้สมัครและผู้ลงคะแนนติดตามสถานะได้อย่างมั่นใจ`
                    : "ตอนนี้ระบบพร้อมรับการโหวตและจะแสดงอันดับแบบสดทันทีเมื่อมีผู้ใช้สิทธิ์คนแรกเข้ามา คะแนนทั้งหมดอ้างอิงจากข้อมูลจริงที่ตรวจสอบได้",
                icon: <Award className="w-7 h-7" />,
              })}

              {/* TWO COLUMN SUMMARY RESULTS CHARTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 1. STAR RESULTS (ดาว) */}
                <div id="star-results-card" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-6 bg-pink-500 rounded-sm inline-block" />
                      <span>อันดับดาวประจำแผนก 🌟</span>
                    </h3>
                    <span className="text-xs font-semibold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full">
                      ดาวการบัญชี
                    </span>
                  </div>

                  <div className="space-y-5">
                    {stats.filter(c => c.type === "star").length === 0 ? (
                      <p className="text-center text-slate-400 py-6 text-sm">ยังไม่มีผู้เข้าสมัครหมวดดาว</p>
                    ) : (
                      [...stats.filter(c => c.type === "star")]
                        .sort((a, b) => b.votesCount - a.votesCount)
                        .map((cand, idx) => {
                          const isLeader = cand.id === starLeaderId;
                          return (
                            <div key={cand.id} className="space-y-2 relative">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {/* Rank Badge */}
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                    idx === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                                  }`}>
                                    {idx + 1}
                                  </div>

                                  {/* Image Circle */}
                                  <div className="relative shrink-0">
                                    {renderCandidateAvatar(cand.imageUrl, cand.type, "w-10 h-10 text-xl border-2 border-pink-500")}
                                    {isLeader && (
                                      <div className="absolute inset-0 bg-pink-500/10 rounded-full flex items-center justify-center pointer-events-none" />
                                    )}
                                  </div>

                                  {/* Candidate detail */}
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1">
                                      <span>หมายเลข {cand.number}</span>
                                      {isLeader && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />}
                                    </h4>
                                    <p className="text-xs text-slate-500 truncate max-w-[150px] sm:max-w-xs">{cand.name}</p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="font-extrabold text-sm text-slate-900">{cand.votesCount} คะแนน</span>
                                  <span className="block text-[10px] text-slate-400">{cand.percentage}% ของโหวตทั้งหมด</span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${cand.percentage}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  className={`h-full rounded-full ${
                                    idx === 0 
                                      ? "bg-gradient-to-r from-pink-500 to-rose-600" 
                                      : "bg-pink-400"
                                  }`}
                                />
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* 2. MOON RESULTS (เดือน) */}
                <div id="moon-results-card" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-6 bg-sky-500 rounded-sm inline-block" />
                      <span>อันดับเดือนประจำแผนก 🌙</span>
                    </h3>
                    <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full">
                      เดือนการบัญชี
                    </span>
                  </div>

                  <div className="space-y-5">
                    {stats.filter(c => c.type === "moon").length === 0 ? (
                      <p className="text-center text-slate-400 py-6 text-sm">ยังไม่มีผู้เข้าสมัครหมวดเดือน</p>
                    ) : (
                      [...stats.filter(c => c.type === "moon")]
                        .sort((a, b) => b.votesCount - a.votesCount)
                        .map((cand, idx) => {
                          const isLeader = cand.id === moonLeaderId;
                          return (
                            <div key={cand.id} className="space-y-2 relative">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {/* Rank Badge */}
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                    idx === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                                  }`}>
                                    {idx + 1}
                                  </div>

                                  {/* Image Circle */}
                                  <div className="relative shrink-0">
                                    {renderCandidateAvatar(cand.imageUrl, cand.type, "w-10 h-10 text-xl border-2 border-sky-500")}
                                    {isLeader && (
                                      <div className="absolute inset-0 bg-sky-500/10 rounded-full flex items-center justify-center pointer-events-none" />
                                    )}
                                  </div>

                                  {/* Candidate detail */}
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1">
                                      <span>หมายเลข {cand.number}</span>
                                      {isLeader && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />}
                                    </h4>
                                    <p className="text-xs text-slate-500 truncate max-w-[150px] sm:max-w-xs">{cand.name}</p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="font-extrabold text-sm text-slate-900">{cand.votesCount} คะแนน</span>
                                  <span className="block text-[10px] text-slate-400">{cand.percentage}% ของโหวตทั้งหมด</span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${cand.percentage}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  className={`h-full rounded-full ${
                                    idx === 0 
                                      ? "bg-gradient-to-r from-sky-500 to-blue-600" 
                                      : "bg-sky-400"
                                  }`}
                                />
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

              </div>

              {/* Informative transparency note */}
              <div className="rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-4 text-center shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Fair Vote Notice</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                  การแสดงผลแบบเรียลไทม์เป็นข้อมูลจริงที่จัดทำขึ้นโดยแผนกการบัญชี เทคนิคจันท์ เพื่อให้ผู้เข้าประกวดและผู้ลงคะแนนทุกคนได้รับทราบสถานะอย่างเป็นธรรม โปร่งใส และตรวจสอบได้
                </p>
              </div>

            </motion.div>
          )}

          {/* TAB 3: ADMIN PANEL (หลังบ้าน) */}
          {activeTab === "admin" && (
            <motion.div
              key="admin-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* Admin Login Portal Shield */}
              {!adminToken ? (
                <div id="admin-login-container" className="max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mt-6">
                  <div className="p-8 text-center bg-gradient-to-b from-slate-50 to-white">
                    <div className="w-16 h-16 bg-slate-900 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-md mb-4 rotate-3 hover:rotate-0 transition-transform">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">ระบบแอดมินหลังบ้าน</h2>
                    <p className="text-sm text-slate-500 mt-2">
                      ใช้สำหรับการจัดการข้อมูลผู้เข้าสมัครดาว-เดือน ตรวจสอบรายชื่อผู้โหวต และดูแลระบบทั้งหมด
                    </p>
                    
                    <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
                      <div>
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="กรอกรหัสแอดมินหลังบ้าน"
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 transition-all text-center text-slate-800"
                        />
                        <p className="text-[10px] text-slate-400 mt-1.5 text-left pl-1">
                        </p>
                      </div>

                      {adminError && renderInlineNotice(adminError)}

                      <button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        เข้าสู่ระบบแอดมิน
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                /* Admin Dashboard Main Workspace */
                <div id="admin-workspace" className="space-y-8">
                  
                  {/* Admin Welcome Header Banner */}
                  <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-400 text-slate-950 p-2.5 rounded-2xl">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">คอนโซลแอดมิน (Admin Control Console)</h2>
                        <p className="text-xs text-slate-400">ควบคุม ตรวจสอบ และลบแก้ไขข้อมูลต่างๆ อย่างเป็นระบบ</p>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleResetAllVotes}
                        className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        ⚠️ รีเซ็ตคะแนนทั้งหมด
                      </button>
                      <button
                        onClick={handleAdminLogout}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>ออกจากระบบแอดมิน</span>
                      </button>
                    </div>
                  </div>

                  {renderHighlightNotice({
                    badge: "Admin Status",
                    title: "คุณอยู่ในพื้นที่ควบคุมข้อมูลจริงของระบบโหวตทั้งหมด",
                    description:
                      auditVotes.length > 0
                        ? `ขณะนี้ระบบมีบันทึกการใช้สิทธิ์แล้ว ${auditVotes.length} รายการ การแก้ไขผู้สมัคร การรีเซ็ตคะแนน และการยกเลิกสิทธิ์ จะมีผลกับข้อมูลกลางทันที ควรตรวจสอบก่อนยืนยันทุกครั้ง`
                        : "ยังไม่มีบันทึกการใช้สิทธิ์ในรอบนี้ แต่ทุกคำสั่งในพื้นที่แอดมินจะมีผลกับฐานข้อมูลทันที ควรตรวจสอบความถูกต้องของข้อมูลผู้สมัครและสิทธิ์ก่อนบันทึก",
                    icon: <Lock className="w-7 h-7" />,
                    tone: "slate",
                  })}

                  {/* 1. MANAGE CANDIDATES SECTION */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                        <span>👥 จัดการข้อมูลผู้เข้าประกวด</span>
                        <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          มีทั้งหมด {candidates.length} คน
                        </span>
                      </h3>

                      <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                      >
                        {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>{showAddForm ? "ปิดฟอร์ม" : "เพิ่มผู้เข้าประกวด"}</span>
                      </button>
                    </div>

                    {/* FORM: Add Candidate */}
                    {showAddForm && (
                      <form onSubmit={handleAddCandidate} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                        <h4 className="font-bold text-sm text-slate-700">กรอกข้อมูลผู้เข้าประกวดรายใหม่</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">ชื่อ-นามสกุล / ชื่อเล่น</label>
                            <input
                              type="text"
                              required
                              value={newCandidate.name}
                              onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                              placeholder="เช่น นางสาวอริสรา วันดี (น้องพลอย)"
                              className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">ประเภท</label>
                            <select
                              value={newCandidate.type}
                              onChange={(e) => setNewCandidate({ 
                                ...newCandidate, 
                                type: e.target.value as CandidateType,
                                // Auto-assign realistic next number
                                number: candidates.filter(c => c.type === e.target.value).length + 1
                              })}
                              className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600"
                            >
                              <option value="star">🌟 ดาว (Star)</option>
                              <option value="moon">🌙 เดือน (Moon)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">หมายเลขประกวด (Number)</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={newCandidate.number}
                              onChange={(e) => setNewCandidate({ ...newCandidate, number: Number(e.target.value) })}
                              placeholder="เช่น 1"
                              className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">ลิงก์รูปภาพ (Image URL)</label>
                            <input
                              type="url"
                              required
                              value={newCandidate.imageUrl}
                              onChange={(e) => setNewCandidate({ ...newCandidate, imageUrl: e.target.value })}
                              placeholder="แนะนำใช้ Unsplash หรือลิงก์ภาพออนไลน์ทั่วไป"
                              className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600"
                            />
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-semibold text-slate-500">ประวัติโดยย่อ / สโลแกน (Bio)</label>
                            <textarea
                              rows={2}
                              value={newCandidate.bio}
                              onChange={(e) => setNewCandidate({ ...newCandidate, bio: e.target.value })}
                              placeholder="สโลแกนประจำตัว คณะ คติพจน์..."
                              className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
                          >
                            บันทึกเพิ่มข้อมูล
                          </button>
                        </div>
                      </form>
                    )}

                    {/* FORM: Edit Candidate */}
                    {editingCandidate && (
                      <form onSubmit={handleSaveEditCandidate} className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 space-y-4">
                        <h4 className="font-bold text-sm text-amber-900 flex items-center gap-1">
                          <Edit2 className="w-4 h-4" />
                          <span>กำลังแก้ไขข้อมูล: {editingCandidate.name}</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">ชื่อ-นามสกุล</label>
                            <input
                              type="text"
                              value={editingCandidate.name}
                              onChange={(e) => setEditingCandidate({ ...editingCandidate, name: e.target.value })}
                              className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">หมายเลขประกวด</label>
                            <input
                              type="number"
                              value={editingCandidate.number}
                              onChange={(e) => setEditingCandidate({ ...editingCandidate, number: Number(e.target.value) })}
                              className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">ลิงก์รูปภาพ</label>
                            <input
                              type="text"
                              value={editingCandidate.imageUrl}
                              onChange={(e) => setEditingCandidate({ ...editingCandidate, imageUrl: e.target.value })}
                              className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-semibold text-slate-500">ประวัติโดยย่อ / สโลแกน</label>
                            <textarea
                              rows={2}
                              value={editingCandidate.bio}
                              onChange={(e) => setEditingCandidate({ ...editingCandidate, bio: e.target.value })}
                              className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCandidate(null)}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition"
                          >
                            บันทึก
                          </button>
                        </div>
                      </form>
                    )}

                    {/* CANDIDATES TABLE LIST */}
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b border-slate-100">
                            <th className="py-3 px-4 font-bold text-xs uppercase tracking-wide">รูปภาพ</th>
                            <th className="py-3 px-4 font-bold text-xs uppercase tracking-wide">ประเภท</th>
                            <th className="py-3 px-4 font-bold text-xs uppercase tracking-wide">หมายเลข</th>
                            <th className="py-3 px-4 font-bold text-xs uppercase tracking-wide">ชื่อ-สกุล</th>
                            <th className="py-3 px-4 font-bold text-xs uppercase tracking-wide">คะแนนดิบ</th>
                            <th className="py-3 px-4 font-bold text-xs uppercase tracking-wide text-right">ดำเนินการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {candidates.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400">ไม่มีข้อมูลผู้สมัครเข้าร่วมการประกวด</td>
                            </tr>
                          ) : (
                            candidates
                              .sort((a, b) => {
                                if (a.type !== b.type) return a.type === "star" ? -1 : 1;
                                return a.number - b.number;
                              })
                              .map((cand) => (
                                <tr key={cand.id} className="hover:bg-slate-50/50 transition">
                                  <td className="py-2.5 px-4">
                                    {renderCandidateAvatar(cand.imageUrl, cand.type, "w-10 h-10 text-xl border border-slate-200 shadow-sm")}
                                  </td>
                                  <td className="py-2.5 px-4 font-semibold text-xs">
                                    {cand.type === "star" ? (
                                      <span className="text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">ดาว ⭐</span>
                                    ) : (
                                      <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">เดือน 🌙</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                                    {cand.number < 10 ? `0${cand.number}` : cand.number}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <div className="font-bold text-slate-800 text-xs">{cand.name}</div>
                                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{cand.bio}</div>
                                  </td>
                                  <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">
                                    {cand.votesCount} คะแนน
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => setEditingCandidate(cand)}
                                        className="p-1.5 text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 rounded-lg transition"
                                        title="แก้ไขข้อมูล"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCandidate(cand.id)}
                                        className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition"
                                        title="ลบข้อมูล"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2. SYSTEM AUDIT TRAIL LOG */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                        <span>🕵️ บันทึกประวัติและตรวจสอบความโปร่งใส (System Audit Trail)</span>
                        <span className="text-xs bg-slate-100 px-2.5 py-0.5 rounded-full font-mono text-slate-600">
                          {auditVotes.length} สิทธิ์โหวตแล้ว
                        </span>
                      </h3>

                      <button
                        onClick={() => {
                          fetchAuditLogs();
                          showNotification("success", "โหลดบันทึกตรวจสอบความถูกต้องล่าสุดเรียบร้อย");
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 transition text-slate-600"
                        title="รีเฟรชประวัติ"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      แผงบันทึกสำหรับให้ผู้ดูแลระบบตรวจสอบรายรหัสนักศึกษาที่เข้ามาใช้สิทธิ์ ป้องกันการสวมสิทธิ์ และสามารถวิเคราะห์การกระจายตัวของคะแนนโหวตเพื่อความโปร่งใสสูงสุดของวิทยาลัย
                    </p>

                    <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-4 font-bold text-[11px]">รหัสนักศึกษา</th>
                            <th className="py-2.5 px-4 font-bold text-[11px]">โหวตดาวที่เลือก</th>
                            <th className="py-2.5 px-4 font-bold text-[11px]">โหวตเดือนที่เลือก</th>
                            <th className="py-2.5 px-4 font-bold text-[11px]">เวลาโหวต</th>
                            <th className="py-2.5 px-4 font-bold text-[11px] text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {auditVotes.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-slate-400">ยังไม่มีผู้ลงคะแนนโหวตในระบบในขณะนี้</td>
                            </tr>
                          ) : (
                            auditVotes
                              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                              .map((vote, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-4 font-mono font-bold text-slate-700">{vote.studentId}</td>
                                  <td className="py-2 px-4 font-medium text-pink-700">{getCandidateName(vote.starId)}</td>
                                  <td className="py-2 px-4 font-medium text-sky-700">{getCandidateName(vote.moonId)}</td>
                                  <td className="py-2 px-4 text-slate-400 font-mono">
                                    {new Date(vote.timestamp).toLocaleString("th-TH")}
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    <button
                                      onClick={() => handleCancelVote(vote.studentId)}
                                      className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-100 transition shadow-sm"
                                      title="ยกเลิกผลโหวตของรหัสนี้"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>ยกเลิกผลโหวต</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer Branding of Accounting Department */}
      <footer id="main-footer" className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-2">
          <p className="font-medium text-slate-300">
            ระบบโหวตประกวดดาวเดือนออนไลน์ แผนกการบัญชี วิทยาลัยเทคนิคจันทบุรี
          </p>
          <p className="text-[11px] text-slate-500">
            &copy; 2026 Accounting ATC (Chanthaburi Technical College). All Rights Reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
