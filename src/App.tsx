/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Briefcase, 
  User, 
  Home, 
  Bell, 
  Search, 
  ArrowRight, 
  Pencil, 
  Brain, 
  Plus, 
  CheckCircle, 
  ExternalLink,
  Calendar,
  ChevronRight,
  Filter,
  X,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  GraduationCap,
  Star,
  MessageSquare,
  Trash2,
  Settings,
  ShieldCheck,
  LogOut,
  LogIn
} from 'lucide-react';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  doc, 
  updateDoc, 
  setDoc,
  getDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';

// --- Types ---
interface Opportunity {
  id: string;
  title: string;
  category: string;
  deadline: string;
  eligibility: string;
  description: string;
  link: string;
  tags: string[];
  matchScore: number;
}

interface UserProfile {
  name: string;
  grade: string;
  country: string;
  destination: string;
  interests: string[];
  languages: string[];
  role: 'user' | 'admin' | 'owner';
  aiStrengthScore: number;
}

interface FeedbackEntry {
  id: string;
  uid: string;
  userName: string;
  rating: number;
  comment: string;
  acceptedUniversities: string[];
  aiStrengthScore: number;
  createdAt: any;
  status: 'pending' | 'approved' | 'hidden';
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || 'unauthenticated',
      email: auth.currentUser?.email || 'none',
    },
    operationType,
    path
  };
  console.error(`[Firestore Error] ${operationType} on ${path}:`, errInfo);
  // Don't throw for list operations to prevent app crash, just log it
  if (operationType !== OperationType.LIST) {
    throw new Error(JSON.stringify(errInfo));
  }
}

// --- Mock Data ---
const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: "1",
    title: "Global Youth Tech Scholarship 2026",
    category: "Scholarships",
    deadline: "2026-06-15",
    eligibility: "Ages 16–24, strong interest in technology",
    description: "Full-ride scholarship to study Computer Science or AI at top global universities.",
    link: "#",
    tags: ["Tech", "STEM"],
    matchScore: 98
  },
  {
    id: "2",
    title: "International Biology Olympiad (IBO)",
    category: "Competitions",
    deadline: "2026-04-30",
    eligibility: "High-school students, ages 15–20",
    description: "Compete against the world's brightest biology students. Winners receive medals and prestige.",
    link: "#",
    tags: ["Biology", "Science"],
    matchScore: 92
  },
  {
    id: "3",
    title: "UN Youth Volunteer Program",
    category: "Volunteering",
    deadline: "2026-05-10",
    eligibility: "Ages 18–30, interested in sustainability",
    description: "6-month volunteer placement working on real climate projects with the United Nations.",
    link: "#",
    tags: ["Climate", "Leadership"],
    matchScore: 85
  },
  {
    id: "4",
    title: "Harvard Business Case Competition",
    category: "Competitions",
    deadline: "2026-07-01",
    eligibility: "High-school students worldwide",
    description: "Solve real business cases and present to Harvard judges. Cash prizes up to $10,000.",
    link: "#",
    tags: ["Business", "Economics"],
    matchScore: 78
  }
];

// --- Components ---

const Logo = ({ className = "h-10 w-auto" }: { className?: string }) => (
  <svg 
    viewBox="0 0 300 100" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Typographic Logo: ACHIEVO with Graduation Cap on 'A' */}
    <g fill="#000000">
      {/* Graduation Cap on top of 'A' */}
      <g transform="translate(2, 5) scale(0.8)">
        <path d="M10 25 L50 10 L90 25 L50 40 Z" />
        <path d="M25 25 L25 35 C25 42 75 42 75 35 L75 25" />
        <path d="M90 25 L90 50" stroke="#000000" strokeWidth="3" fill="none" />
        <circle cx="90" cy="50" r="4" />
      </g>

      {/* Text: ACHIEVO */}
      <text 
        x="0" 
        y="90" 
        fontFamily="Space Grotesk, sans-serif" 
        fontWeight="bold" 
        fontSize="64" 
        letterSpacing="-3"
      >
        ACHIEVO
      </text>
    </g>
  </svg>
);

interface NavItemProps {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
      active 
        ? 'bg-cherry text-white shadow-lg shadow-cherry/20' 
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Icon size={18} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.startsWith('{')) {
        try {
          const info = JSON.parse(event.error.message);
          setErrorMsg(`Firestore Error: ${info.error} during ${info.operationType}`);
          setHasError(true);
        } catch (e) {
          // fallback
        }
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-3xl m-6">
        <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
        <p className="text-red-600 mb-4">{errorMsg}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold"
        >
          Reload App
        </button>
      </div>
    );
  }
  return <>{children}</>;
};

interface OpportunityCardProps {
  opp: Opportunity;
  onClick: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  isAdmin?: boolean;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opp, onClick, onDelete, onEdit, isAdmin }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5 }}
    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer relative"
    onClick={onClick}
  >
    {isAdmin && (
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        {onEdit && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 bg-white/80 backdrop-blur-sm text-slate-400 hover:text-cherry rounded-xl shadow-sm border border-slate-100 transition-all"
            title="Edit Opportunity"
          >
            <Pencil size={16} />
          </button>
        )}
        {onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 bg-white/80 backdrop-blur-sm text-slate-400 hover:text-red-500 rounded-xl shadow-sm border border-slate-100 transition-all"
            title="Delete Opportunity"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    )}
    <div className="flex justify-between items-start mb-4">
      <span className="bg-cherry-light text-cherry text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
        {opp.category}
      </span>
      <div className="flex items-center gap-1 text-cherry font-bold text-sm">
        <Brain size={14} />
        {opp.matchScore}% Match
      </div>
    </div>
    <h3 className="text-xl font-bold mb-2 group-hover:text-cherry transition-colors">{opp.title}</h3>
    <p className="text-slate-500 text-sm line-clamp-2 mb-4">{opp.description}</p>
    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
      <div className="flex items-center gap-2 text-slate-400 text-xs">
        <Calendar size={14} />
        <span>Deadline: {new Date(opp.deadline).toLocaleDateString()}</span>
      </div>
      <ChevronRight size={18} className="text-slate-300 group-hover:text-cherry transition-colors" />
    </div>
  </motion.div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [dbOpportunities, setDbOpportunities] = useState<Opportunity[]>([]);
  const [hiddenMockIds, setHiddenMockIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [editingOppId, setEditingOppId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const [newOppForm, setNewOppForm] = useState({
    title: '',
    category: 'Scholarships',
    deadline: '',
    eligibility: '',
    description: '',
    link: '#',
    tags: ''
  });
  
  const [profile, setProfile] = useState<UserProfile>({
    name: "Guest User",
    grade: "N/A",
    country: "World",
    destination: "Global",
    interests: [],
    languages: [],
    role: 'user',
    aiStrengthScore: 0
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<UserProfile>(profile);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 10,
    comment: '',
    acceptedUniversities: '',
  });

  useEffect(() => {
    setEditProfileForm(profile);
  }, [profile]);

  const saveProfile = async () => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        name: editProfileForm.name,
        grade: editProfileForm.grade,
        country: editProfileForm.country,
        destination: editProfileForm.destination,
        interests: editProfileForm.interests,
        languages: editProfileForm.languages
      });
      setIsEditingProfile(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, '_test_connection_', 'ping'));
        console.log("Firestore connection test: Success");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firestore connection test: Failed (Client is offline). Check Firebase configuration.");
        } else {
          console.log("Firestore connection test: Handled error (expected if collection doesn't exist)", error);
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setProfile({
          name: "Guest User",
          grade: "N/A",
          country: "World",
          destination: "Global",
          interests: [],
          languages: [],
          role: 'user',
          aiStrengthScore: 0
        });
        setIsAuthReady(true);
        return;
      }

      // Initial check/creation
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const isOwnerEmail = user.email === 'sabrinaxon.0811@gmail.com';
      
      if (!userDoc.exists()) {
        const initialRole = isOwnerEmail ? 'owner' : 'user';
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || 'Anonymous',
          email: user.email,
          role: initialRole,
          aiStrengthScore: 0
        });
      } else {
        const data = userDoc.data();
        if (isOwnerEmail && data.role !== 'owner') {
          await updateDoc(userRef, { role: 'owner' });
        }
        // Reset legacy hardcoded score
        if (data.aiStrengthScore === 84) {
          await updateDoc(userRef, { aiStrengthScore: 0 });
        }
      }
      // Real-time listener for profile changes
      const unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            name: data.name || 'Anonymous',
            role: data.role || 'user',
            aiStrengthScore: data.aiStrengthScore || 0,
            grade: data.grade || 'N/A',
            country: data.country || 'N/A',
            destination: data.destination || 'N/A',
            interests: data.interests || [],
            languages: data.languages || []
          });
        }
        setIsAuthReady(true);
      }, (error) => {
        console.error("Profile listener error:", error);
        setIsAuthReady(true);
      });

      return () => unsubscribeProfile();
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedbackEntry));
      setFeedbacks(entries);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'feedback'));
    return () => unsubscribe();
  }, [isAuthReady]);

  useEffect(() => {
    if (!isAuthReady || profile.role === 'user') return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    return () => unsubscribe();
  }, [isAuthReady, profile.role]);

  useEffect(() => {
    if (!isAuthReady) return;
    const unsubscribe = onSnapshot(collection(db, 'opportunities'), (snapshot) => {
      setDbOpportunities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Opportunity)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'opportunities'));
    return () => unsubscribe();
  }, [isAuthReady]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => signOut(auth);

  const submitFeedback = async () => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'feedback'), {
        uid: currentUser.uid,
        userName: profile.name,
        rating: feedbackForm.rating,
        comment: feedbackForm.comment,
        acceptedUniversities: feedbackForm.acceptedUniversities.split(',').map(s => s.trim()).filter(Boolean),
        aiStrengthScore: profile.aiStrengthScore,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      setFeedbackForm({ rating: 10, comment: '', acceptedUniversities: '' });
      setActiveTab('analysis');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'feedback');
    }
  };

  const updateFeedbackStatus = async (id: string, status: 'approved' | 'hidden') => {
    try {
      await updateDoc(doc(db, 'feedback', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `feedback/${id}`);
    }
  };

  const deleteFeedback = async (id: string) => {
    // Note: window.confirm might fail in iframes
    try {
      await deleteDoc(doc(db, 'feedback', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `feedback/${id}`);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const addOpportunity = async () => {
    try {
      if (editingOppId) {
        const oppRef = doc(db, 'opportunities', editingOppId);
        await updateDoc(oppRef, {
          ...newOppForm,
          tags: typeof newOppForm.tags === 'string' ? newOppForm.tags.split(',').map(t => t.trim()) : newOppForm.tags
        });
        setEditingOppId(null);
      } else {
        await addDoc(collection(db, 'opportunities'), {
          ...newOppForm,
          tags: newOppForm.tags.split(',').map(t => t.trim()),
          matchScore: Math.floor(Math.random() * 30) + 70 // Random high match for demo
        });
      }
      setNewOppForm({
        title: '',
        category: 'Scholarships',
        deadline: '',
        eligibility: '',
        description: '',
        link: '#',
        tags: ''
      });
    } catch (error) {
      handleFirestoreError(error, editingOppId ? OperationType.UPDATE : OperationType.CREATE, 'opportunities');
    }
  };

  const startEditingOpp = (opp: Opportunity) => {
    setEditingOppId(opp.id);
    setNewOppForm({
      title: opp.title,
      category: opp.category,
      deadline: opp.deadline,
      eligibility: opp.eligibility,
      description: opp.description,
      link: opp.link,
      tags: opp.tags.join(', ')
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditingOpp = () => {
    setEditingOppId(null);
    setNewOppForm({
      title: '',
      category: 'Scholarships',
      deadline: '',
      eligibility: '',
      description: '',
      link: '#',
      tags: ''
    });
  };

  const deleteOpportunity = async (id: string) => {
    try {
      if (id.length <= 5) {
        setHiddenMockIds(prev => [...prev, id]);
        setConfirmDeleteId(null);
        return;
      }
      await deleteDoc(doc(db, 'opportunities', id));
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `opportunities/${id}`);
    }
  };

  useEffect(() => {
    const seedInitialData = async () => {
      if (!isAuthReady || dbOpportunities.length > 0 || isSeeding) return;
      setIsSeeding(true);
      try {
        // Only seed if there are NO opportunities in the DB at all
        for (const opp of MOCK_OPPORTUNITIES) {
          const { id, ...data } = opp;
          await addDoc(collection(db, 'opportunities'), {
            ...data,
            matchScore: opp.matchScore
          });
        }
        console.log("Seeding complete");
      } catch (error) {
        console.error("Error seeding data:", error);
      } finally {
        setIsSeeding(false);
      }
    };
    seedInitialData();
  }, [isAuthReady, dbOpportunities.length]);

  const allOpportunities = [...dbOpportunities, ...MOCK_OPPORTUNITIES.filter(o => !hiddenMockIds.includes(o.id))].filter((opp, index, self) => 
    index === self.findIndex((t) => t.title === opp.title) // Prevent duplicates during seeding
  );

  const filteredOpportunities = allOpportunities.filter(opp => 
    opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateStats = () => {
    const approved = feedbacks.filter(f => f.status === 'approved' || profile.role !== 'user');
    const total = approved.length || 1;
    const usefulCount = approved.filter(f => f.rating >= 7).length;
    const acceptedCount = approved.filter(f => f.acceptedUniversities.length > 0).length;
    const avgAiStrength = approved.length > 0 
      ? Math.round(approved.reduce((acc, f) => acc + (f.aiStrengthScore || 0), 0) / approved.length)
      : 0;
    
    return {
      usefulPercentage: Math.round((usefulCount / total) * 100),
      acceptedPercentage: Math.round((acceptedCount / total) * 100),
      totalUsers: approved.length,
      avgAiStrength
    };
  };

  const stats = calculateStats();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cherry border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium font-display uppercase tracking-widest text-xs">Loading Achievo...</p>
        </div>
      </div>
    );
  }

  const ProtectedTab = ({ children }: { children: React.ReactNode }) => {
    if (!currentUser) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center space-y-8"
        >
          <div className="w-24 h-24 bg-cherry/10 text-cherry rounded-[2rem] flex items-center justify-center">
            <ShieldCheck size={48} />
          </div>
          <div className="space-y-4 max-w-md">
            <h2 className="text-4xl font-display font-bold text-slate-900">Protected Area</h2>
            <p className="text-lg text-slate-500">Log in to unlock your personalized analysis, build your portfolio, and share feedback with the community.</p>
          </div>
          <button 
            onClick={handleLogin}
            className="bg-cherry text-white px-10 py-5 rounded-3xl font-bold text-lg hover:bg-cherry-hover transition-all shadow-2xl shadow-cherry/20 flex items-center gap-3"
          >
            Log In to Continue <ArrowRight size={20} />
          </button>
        </motion.div>
      );
    }
    return <>{children}</>;
  };

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <Logo className="h-10 w-auto" />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <NavItem icon={Home} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavItem icon={Search} label="Opportunities" active={activeTab === 'opportunities'} onClick={() => setActiveTab('opportunities')} />
            <NavItem icon={BarChart3} label="Analysis" active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
            <NavItem icon={MessageSquare} label="Feedback" active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} />
            {profile.role !== 'user' && (
              <NavItem icon={Settings} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
            )}
            <NavItem icon={Briefcase} label="Portfolio" active={activeTab === 'portfolio'} onClick={() => setActiveTab('portfolio')} />
            <NavItem icon={User} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-4">
                <button onClick={handleLogout} className="text-slate-400 hover:text-cherry transition-colors">
                  <LogOut size={22} />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                  {profile.name[0]}
                </div>
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-cherry text-white px-6 py-2 rounded-full font-bold flex items-center gap-2">
                <LogIn size={18} /> Login
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              {/* Hero for Guests / Welcome for Users */}
              {!currentUser ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-10 md:py-16">
                  <div className="space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cherry/5 text-cherry font-bold text-sm tracking-tight border border-cherry/10">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cherry opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cherry"></span>
                      </span>
                      Join 12,000+ Students Today
                    </div>
                    <h1 className="text-6xl lg:text-7xl font-display font-bold text-slate-900 leading-[1] tracking-tight">
                      Experience <br /> <span className="text-cherry italic">Achievo</span>.
                    </h1>
                    <p className="text-lg text-slate-500 max-w-xl leading-relaxed">
                      Analyze your profile with AI, track elite opportunities, and build a winning portfolio for global recognition.
                    </p>
                    <button 
                      onClick={handleLogin}
                      className="bg-cherry text-white px-10 py-5 rounded-3xl font-bold text-lg hover:bg-cherry-hover transition-all shadow-2xl shadow-cherry/20 flex items-center justify-center gap-3"
                    >
                      Sign Up with Google <ArrowRight size={20} />
                    </button>
                  </div>
                  <div className="relative group hidden lg:block">
                    <div className="absolute -inset-4 bg-gradient-to-tr from-cherry to-orange-500 rounded-[3rem] opacity-20 blur-3xl group-hover:opacity-30 transition-opacity"></div>
                    <div className="relative bg-white border border-slate-200 rounded-[3rem] p-8 shadow-2xl">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-cherry rounded-2xl flex items-center justify-center text-white">
                              <Trophy size={24} />
                            </div>
                            <div>
                              <div className="font-bold">Cambridge University</div>
                              <div className="text-xs text-slate-400">ISA Scholarship 2026</div>
                            </div>
                          </div>
                          <div className="text-cherry font-bold text-sm bg-cherry/5 px-3 py-1 rounded-full">
                            96% Match
                          </div>
                        </div>
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                            <Brain size={14} className="text-cherry" /> AI SUGGESTION
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            Complete your profile to unlock <span className="text-cherry font-bold">2 more</span> elite grants.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <header className="space-y-4">
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-6xl font-display font-bold text-slate-900 leading-tight"
                  >
                    Welcome, <span className="text-cherry">{profile.name.split(' ')[0]}</span>. 👋
                  </motion.h2>
                  <p className="text-xl text-slate-500 max-w-2xl">
                    We've found <span className="text-cherry font-semibold">7 new opportunities</span> matching your interests.
                  </p>
                </header>
              )}

              {/* AI Banner */}
              <div className="relative overflow-hidden bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cherry/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-2 text-cherry font-bold text-sm uppercase tracking-widest">
                      <Brain size={20} />
                      <span>AI Recommendation Engine</span>
                    </div>
                    <h3 className="text-4xl font-bold text-slate-900">Your profile match score improved by 18%</h3>
                    <p className="text-lg text-slate-500">By adding your recent biology project, you've unlocked access to 3 elite research grants.</p>
                    <button 
                      onClick={() => setActiveTab('opportunities')}
                      className="bg-cherry text-white px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 hover:bg-cherry-hover transition-all shadow-xl shadow-cherry/20"
                    >
                      Explore Matches <ArrowRight size={20} />
                    </button>
                  </div>
                  <div className="w-full md:w-1/3 grid grid-cols-2 gap-4">
                    {[98, 92, 85, 78].map((score, i) => (
                      <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-cherry">{score}%</span>
                        <span className="text-xs text-slate-400 uppercase font-bold tracking-tighter">Match</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Picks */}
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-bold">Top Picks for You</h3>
                  <button onClick={() => setActiveTab('opportunities')} className="text-cherry font-bold flex items-center gap-1 hover:underline">
                    View all <ChevronRight size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {MOCK_OPPORTUNITIES.map(opp => (
                    <OpportunityCard key={opp.id} opp={opp} onClick={() => setSelectedOpp(opp)} />
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'opportunities' && (
            <motion.div 
              key="opportunities"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-5xl font-display font-bold text-slate-900">Explore Opportunities</h2>
                  <p className="text-slate-500 text-lg">Find the perfect scholarship, competition, or program.</p>
                </div>
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search scholarships, olympiads..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-cherry focus:ring-4 focus:ring-cherry/5 transition-all"
                  />
                </div>
              </header>

              <div className="flex flex-wrap gap-2">
                {['All', 'Scholarships', 'Competitions', 'Volunteering', 'Research'].map(cat => (
                  <button key={cat} className="px-6 py-2 rounded-full border border-slate-200 bg-white text-slate-600 font-medium hover:border-cherry hover:text-cherry transition-all">
                    {cat}
                  </button>
                ))}
                <button className="ml-auto flex items-center gap-2 text-slate-500 font-medium px-4 py-2 hover:text-cherry">
                  <Filter size={18} /> Filter
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredOpportunities.map(opp => (
                  <OpportunityCard 
                    key={opp.id} 
                    opp={opp} 
                    onClick={() => setSelectedOpp(opp)} 
                    isAdmin={profile.role === 'admin' || profile.role === 'owner'}
                    onEdit={() => {
                      setActiveTab('admin');
                      startEditingOpp(opp);
                    }}
                    onDelete={() => setConfirmDeleteId(opp.id)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {confirmDeleteId && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmDeleteId(null)}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 text-center"
                >
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Are you sure?</h3>
                  <p className="text-slate-500 mb-8">This action cannot be undone. This opportunity will be permanently removed.</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => deleteOpportunity(confirmDeleteId)}
                      className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteId(null)}
                      className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {activeTab === 'analysis' && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <header className="space-y-2">
                <h2 className="text-5xl font-display font-bold text-slate-900">Community Analysis</h2>
                <p className="text-slate-500 text-lg">Real-time insights based on user feedback and success stories.</p>
              </header>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm text-center space-y-2">
                  <div className="w-12 h-12 bg-cherry-light text-cherry rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Star size={24} />
                  </div>
                  <div className="text-5xl font-bold text-slate-900">{stats.usefulPercentage}%</div>
                  <p className="text-slate-500 font-medium">High Satisfaction</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm text-center space-y-2">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <GraduationCap size={24} />
                  </div>
                  <div className="text-5xl font-bold text-slate-900">{stats.acceptedPercentage}%</div>
                  <p className="text-slate-500 font-medium">University Acceptance</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Brain size={24} />
                  </div>
                  <div className="text-5xl font-bold text-slate-900">{stats.avgAiStrength}</div>
                  <p className="text-slate-500 font-medium">Avg. AI Strength</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm text-center space-y-2">
                  <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <User size={24} />
                  </div>
                  <div className="text-5xl font-bold text-slate-900">{stats.totalUsers}</div>
                  <p className="text-slate-500 font-medium">Total Feedbacks</p>
                </div>
              </div>

              {/* Success Stories List */}
              <section className="space-y-8">
                <h3 className="text-3xl font-bold">Student Success Feed</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {feedbacks.filter(f => f.status === 'approved' || profile.role !== 'user').map(item => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative"
                    >
                      {(profile.role === 'admin' || profile.role === 'owner') && (
                        <div className="absolute top-4 right-4 flex gap-2">
                          <button onClick={() => updateFeedbackStatus(item.id, 'approved')} title="Approve" className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"><ShieldCheck size={16}/></button>
                          <button onClick={() => updateFeedbackStatus(item.id, 'hidden')} title="Hide" className="p-1 text-slate-400 hover:bg-slate-50 rounded transition-colors"><X size={16}/></button>
                          <button onClick={() => deleteFeedback(item.id)} title="Delete Permanently" className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
                          {item.userName[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{item.userName}</h4>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Brain size={12} /> AI Strength: {item.aiStrengthScore}
                          </div>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="flex gap-1 mb-2">
                          {[...Array(10)].map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i < item.rating ? 'bg-cherry' : 'bg-slate-200'}`} />
                          ))}
                        </div>
                        <p className="text-slate-600 text-sm italic">"{item.comment}"</p>
                      </div>
                      {item.acceptedUniversities.length > 0 && (
                        <div className="bg-green-50 text-green-700 p-4 rounded-2xl">
                          <p className="text-xs font-bold uppercase tracking-widest mb-1">Accepted to:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.acceptedUniversities.map(uni => (
                              <span key={uni} className="text-xs bg-white px-2 py-0.5 rounded-full border border-green-100">{uni}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'feedback' && (
            <motion.div 
              key="feedback"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-2xl mx-auto space-y-12"
            >
              <header className="text-center space-y-4">
                <h2 className="text-5xl font-display font-bold text-slate-900">Share Your Feedback</h2>
                <p className="text-slate-500 text-lg">Help us improve Achievo and inspire other students.</p>
              </header>

              {!currentUser ? (
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-12 text-center space-y-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <User size={40} />
                  </div>
                  <h3 className="text-2xl font-bold">Please login to provide feedback</h3>
                  <p className="text-slate-500">You need to be signed in with your Google account to share your experience.</p>
                  <button onClick={handleLogin} className="bg-cherry text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 mx-auto hover:bg-cherry-hover transition-all shadow-xl shadow-cherry/20">
                    <LogIn size={20} /> Login with Google
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">How would you rank Achievo? (0-10)</label>
                    <div className="flex justify-between items-center gap-2">
                      {[...Array(11)].map((_, i) => (
                        <button 
                          key={i}
                          onClick={() => setFeedbackForm({...feedbackForm, rating: i})}
                          className={`w-10 h-10 rounded-xl font-bold transition-all ${feedbackForm.rating === i ? 'bg-cherry text-white scale-110 shadow-lg shadow-cherry/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Your Feedback</label>
                    <textarea 
                      placeholder="What do you like? What can we improve?"
                      value={feedbackForm.comment}
                      onChange={(e) => setFeedbackForm({...feedbackForm, comment: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:border-cherry transition-all h-32 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Universities Accepted (comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Harvard, MIT, Stanford"
                      value={feedbackForm.acceptedUniversities}
                      onChange={(e) => setFeedbackForm({...feedbackForm, acceptedUniversities: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:border-cherry transition-all"
                    />
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={submitFeedback}
                      className="w-full bg-cherry text-white py-4 rounded-2xl font-bold hover:bg-cherry-hover transition-all shadow-xl shadow-cherry/20"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'admin' && profile.role !== 'user' && (
          <ProtectedTab>
            <motion.div 
              key="admin"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <header className="space-y-2">
                <h2 className="text-5xl font-display font-bold text-slate-900">Admin Control Center</h2>
                <p className="text-slate-500 text-lg">Manage users, roles, and platform opportunities.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Management */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <User className="text-cherry" /> User Management
                  </h3>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {allUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-900">{u.name || u.email || u.id.substring(0, 8)}</p>
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">{u.role}</p>
                        </div>
                        {profile.role === 'owner' && (
                          <select 
                            value={u.role}
                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1 text-sm outline-none focus:border-cherry"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Opportunity */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                  <h3 className="text-2xl font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {editingOppId ? <Pencil className="text-cherry" /> : <Plus className="text-cherry" />} 
                      {editingOppId ? 'Edit Opportunity' : 'Add Opportunity'}
                    </span>
                    {editingOppId && (
                      <button 
                        onClick={cancelEditingOpp}
                        className="text-sm font-bold text-slate-400 hover:text-cherry transition-colors"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </h3>
                  <div className="space-y-4">
                    <input 
                      type="text" placeholder="Title" 
                      value={newOppForm.title}
                      onChange={(e) => setNewOppForm({...newOppForm, title: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-cherry"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Program Type</label>
                        <select 
                          value={newOppForm.category}
                          onChange={(e) => setNewOppForm({...newOppForm, category: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-cherry"
                        >
                          <option>Scholarships</option>
                          <option>Competitions</option>
                          <option>Volunteering</option>
                          <option>Research</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Deadline Date</label>
                        <input 
                          type="date" 
                          value={newOppForm.deadline}
                          onChange={(e) => setNewOppForm({...newOppForm, deadline: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-cherry"
                        />
                      </div>
                    </div>
                    <textarea 
                      placeholder="Eligibility" 
                      value={newOppForm.eligibility}
                      onChange={(e) => setNewOppForm({...newOppForm, eligibility: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-cherry h-20"
                    />
                    <textarea 
                      placeholder="Description" 
                      value={newOppForm.description}
                      onChange={(e) => setNewOppForm({...newOppForm, description: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-cherry h-24"
                    />
                    <input 
                      type="text" placeholder="Tags (comma separated)" 
                      value={newOppForm.tags}
                      onChange={(e) => setNewOppForm({...newOppForm, tags: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-cherry"
                    />
                    <input 
                      type="text" placeholder="Registration Link (URL)" 
                      value={newOppForm.link}
                      onChange={(e) => setNewOppForm({...newOppForm, link: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-cherry"
                    />
                    <button 
                      onClick={addOpportunity}
                      className="w-full bg-cherry text-white py-4 rounded-2xl font-bold hover:bg-cherry-hover transition-all"
                    >
                      {editingOppId ? 'Update Opportunity' : 'Publish Opportunity'}
                    </button>
                  </div>
                </div>

                {/* Manage Opportunities */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6 lg:col-span-2">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Briefcase className="text-cherry" /> Manage Published Opportunities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                    {dbOpportunities.length === 0 ? (
                      <p className="text-slate-400 italic p-4">No custom opportunities published yet.</p>
                    ) : (
                      dbOpportunities.map(opp => (
                        <div key={opp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{opp.title}</p>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">{opp.category} • {new Date(opp.deadline).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => startEditingOpp(opp)}
                              className="p-2 text-slate-400 hover:text-cherry hover:bg-cherry-light rounded-xl transition-all"
                              title="Edit Opportunity"
                            >
                              <Pencil size={20} />
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteId(opp.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Opportunity"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Feedback Management */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6 lg:col-span-2">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="text-cherry" /> Feedback Moderation
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
                    {feedbacks.length === 0 ? (
                      <p className="text-slate-400 italic">No feedbacks found.</p>
                    ) : (
                      feedbacks.map(item => (
                        <div key={item.id} className={`p-5 rounded-2xl border transition-all ${item.status === 'pending' ? 'bg-orange-50/50 border-orange-100' : item.status === 'hidden' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 truncate">{item.userName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.status}</p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              {item.status !== 'approved' && (
                                <button onClick={() => updateFeedbackStatus(item.id, 'approved')} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg" title="Approve"><ShieldCheck size={14}/></button>
                              )}
                              {item.status !== 'hidden' && (
                                <button onClick={() => updateFeedbackStatus(item.id, 'hidden')} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg" title="Hide"><X size={14}/></button>
                              )}
                              <button onClick={() => deleteFeedback(item.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg" title="Delete"><Trash2 size={14}/></button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 italic mb-2">"{item.comment}"</p>
                          <div className="flex items-center gap-1">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < item.rating ? 'bg-cherry' : 'bg-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </ProtectedTab>
        )}

        {activeTab === 'portfolio' && (
          <motion.div 
            key="portfolio"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <header className="space-y-2">
                <h2 className="text-5xl font-display font-bold text-slate-900">Your Portfolio</h2>
                <p className="text-slate-500 text-lg">Build a winning profile for your future applications.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      <CheckCircle className="text-cherry" />
                      Portfolio Checklist
                    </h3>
                    <div className="space-y-4">
                      {[
                        { label: "Academic Transcripts", status: "pending" },
                        { label: "Personal Statement (Draft)", status: "pending" },
                        { label: "Letters of Recommendation", status: "pending" },
                        { label: "Extracurricular Activities", status: "pending" },
                        { label: "Standardized Test Scores", status: "pending" }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <span className="font-medium text-slate-700">{item.label}</span>
                          {item.status === 'complete' ? (
                            <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold uppercase">Complete</span>
                          ) : (
                            <button 
                              onClick={() => {
                                if (!currentUser) handleLogin();
                                else {
                                  // Logic for upload
                                  alert('Upload feature coming soon for verified accounts!');
                                }
                              }}
                              className="text-cherry hover:underline text-sm font-bold"
                            >
                              Upload Now
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-cherry text-white rounded-[2rem] p-8 shadow-xl shadow-cherry/20">
                    <h3 className="text-2xl font-bold mb-4">AI Strength Score</h3>
                    <div className="text-6xl font-bold mb-4">{profile.aiStrengthScore}<span className="text-2xl opacity-50">/100</span></div>
                    <p className="text-cherry-light/80 mb-6 font-medium">
                      {profile.aiStrengthScore > 0 
                        ? `Your profile is stronger than ${Math.floor(profile.aiStrengthScore * 1.1)}% of applicants in your region.`
                        : "Complete your checklist to calculate your competitive advantage."}
                    </p>
                    <button 
                      onClick={() => {
                        if (!currentUser) handleLogin();
                        else alert('Our AI is analyzing your specific profile improvements...');
                      }}
                      className="w-full bg-white text-cherry py-4 rounded-2xl font-bold hover:bg-slate-50 transition-colors"
                    >
                      Get Improvement Tips
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-3xl mx-auto space-y-12"
            >
              <div className="text-center space-y-4">
                <div className="w-32 h-32 bg-cherry rounded-[2.5rem] mx-auto flex items-center justify-center text-white text-5xl font-bold shadow-2xl shadow-cherry/30">
                  {profile.name[0]}
                </div>
                <h2 className="text-4xl font-display font-bold text-slate-900">{profile.name}</h2>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-slate-500 font-medium">{profile.grade} • {profile.country}</p>
                  {profile.role !== 'user' && (
                    <span className="bg-cherry/10 text-cherry text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={10} /> {profile.role}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-10">
                {isEditingProfile ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                        <input 
                          type="text" 
                          value={editProfileForm.name}
                          onChange={(e) => setEditProfileForm({...editProfileForm, name: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-cherry"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grade</label>
                        <input 
                          type="text" 
                          value={editProfileForm.grade}
                          onChange={(e) => setEditProfileForm({...editProfileForm, grade: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-cherry"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Country</label>
                        <input 
                          type="text" 
                          value={editProfileForm.country}
                          onChange={(e) => setEditProfileForm({...editProfileForm, country: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-cherry"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Destination</label>
                        <input 
                          type="text" 
                          value={editProfileForm.destination}
                          onChange={(e) => setEditProfileForm({...editProfileForm, destination: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-cherry"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={saveProfile}
                        className="flex-1 bg-cherry text-white py-4 rounded-2xl font-bold hover:bg-cherry-hover transition-all"
                      >
                        Save Changes
                      </button>
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preferred Destination</label>
                        <p className="text-xl font-bold text-slate-900">{profile.destination}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Languages</label>
                        <p className="text-xl font-bold text-slate-900">{profile.languages.join(', ')}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Academic Interests</label>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map(interest => (
                          <span key={interest} className="px-4 py-2 rounded-full bg-cherry-light text-cherry font-bold text-sm">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-slate-400 text-sm italic">Join Achievo to unlock full editing.</p>
                      <button 
                        onClick={() => {
                          if (!currentUser) handleLogin();
                          else setIsEditingProfile(true);
                        }}
                        className="flex items-center gap-2 text-cherry font-bold hover:underline"
                      >
                        <Pencil size={18} /> Edit Profile
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
      </AnimatePresence>
      </main>

      {/* Opportunity Detail Modal */}
      <AnimatePresence>
        {selectedOpp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOpp(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="h-48 bg-cherry relative">
                <button 
                  onClick={() => setSelectedOpp(null)}
                  className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-0 left-0 p-8">
                  <span className="bg-white text-cherry text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block">
                    {selectedOpp.category}
                  </span>
                  <h3 className="text-3xl font-bold text-white">{selectedOpp.title}</h3>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Deadline</label>
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <Calendar size={18} className="text-cherry" />
                      {new Date(selectedOpp.deadline).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Match Score</label>
                    <div className="flex items-center gap-2 text-cherry font-bold">
                      <Brain size={18} />
                      {selectedOpp.matchScore}% Match
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Eligibility</label>
                  <p className="text-slate-700 leading-relaxed">{selectedOpp.eligibility}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <p className="text-slate-700 leading-relaxed">{selectedOpp.description}</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      if (!currentUser) handleLogin();
                      else {
                        const link = selectedOpp.link.startsWith('http') ? selectedOpp.link : `https://${selectedOpp.link}`;
                        window.open(link, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="flex-1 bg-cherry text-white py-4 rounded-2xl font-bold hover:bg-cherry-hover transition-all shadow-lg shadow-cherry/20 flex items-center justify-center gap-2"
                  >
                    Apply Now <ExternalLink size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      if (!currentUser) handleLogin();
                      else {
                        // Logic for saving
                        alert('Opportunity saved to your profile!');
                      }
                    }}
                    className="px-8 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Save for Later
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center">
            <Logo className="h-8 w-auto" />
          </div>
          <div className="flex gap-8 text-sm font-medium text-slate-500">
            <button onClick={() => setActiveTab('dashboard')} className="hover:text-cherry transition-colors">Home</button>
            <button onClick={() => setActiveTab('opportunities')} className="hover:text-cherry transition-colors">Opportunities</button>
            <button onClick={() => setActiveTab('analysis')} className="hover:text-cherry transition-colors">Analysis</button>
            <button onClick={() => setActiveTab('feedback')} className="hover:text-cherry transition-colors">Feedback</button>
            {profile.role !== 'user' && (
              <button onClick={() => setActiveTab('admin')} className="hover:text-cherry transition-colors">Admin</button>
            )}
            <button onClick={() => setActiveTab('portfolio')} className="hover:text-cherry transition-colors">Portfolio</button>
            <button onClick={() => setActiveTab('profile')} className="hover:text-cherry transition-colors">Profile</button>
          </div>
          <p className="text-slate-400 text-sm">© 2026 Achievo. Built for your future.</p>
        </div>
      </footer>
    </div>
    </ErrorBoundary>
  );
}
