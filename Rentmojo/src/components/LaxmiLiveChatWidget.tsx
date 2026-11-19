import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Send,
  Minimize2,
  PhoneCall,
  UserCheck,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Lock,
  Edit3,
  GripVertical,
} from 'lucide-react';
import {
  ChatMessageItem,
  CustomerAccountRecord,
  LiveChatSession,
} from '../data/initialData';

interface LaxmiLiveChatWidgetProps {
  liveChats: LiveChatSession[];
  activeCustomer: CustomerAccountRecord | null;
  detectedIp: string;
  detectedCity: string;
  isCloudConnected?: boolean;
  onUpsertChatSession: (session: LiveChatSession, notifyAdmin?: boolean) => Promise<void>;
  onOpenAdminLiveChat?: () => void;
}

export const LaxmiLiveChatWidget: React.FC<LaxmiLiveChatWidgetProps> = ({
  liveChats,
  activeCustomer,
  detectedIp,
  detectedCity,
  onUpsertChatSession,
  onOpenAdminLiveChat,
}) => {
  // Persist open/minimized state across page changes and browser reloads
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    return localStorage.getItem('rm0_laxmi_widget_open') === 'true';
  });

  // Draggable launcher position (defaults higher up so it never blocks Cart/Checkout buttons)
  const [launcherPos, setLauncherPos] = useState<{ right: number; bottom: number }>(() => {
    try {
      const saved = localStorage.getItem('rm0_laxmi_launcher_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.right === 'number' && typeof parsed?.bottom === 'number') {
          return {
            right: Math.max(8, parsed.right),
            bottom: Math.max(12, parsed.bottom),
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return { right: 14, bottom: 132 };
  });
  const [isDraggingLauncher, setIsDraggingLauncher] = useState<boolean>(false);
  const dragStateRef = useRef<{
    active: boolean;
    moved: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
    width: number;
    height: number;
  }>({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startRight: 14,
    startBottom: 132,
    width: 210,
    height: 52,
  });
  const launcherRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const clampLauncherToViewport = () => {
      const rect = launcherRef.current?.getBoundingClientRect();
      const elWidth = rect?.width || 210;
      const elHeight = rect?.height || 52;
      setLauncherPos((prev) => {
        const maxRight = Math.max(8, window.innerWidth - elWidth - 8);
        const maxBottom = Math.max(12, window.innerHeight - elHeight - 68);
        const clampedRight = Math.min(Math.max(8, prev.right), maxRight);
        const clampedBottom = Math.min(Math.max(12, prev.bottom), maxBottom);
        if (clampedRight === prev.right && clampedBottom === prev.bottom) return prev;
        return { right: clampedRight, bottom: clampedBottom };
      });
    };
    clampLauncherToViewport();
    window.addEventListener('resize', clampLauncherToViewport);
    return () => window.removeEventListener('resize', clampLauncherToViewport);
  }, []);

  const handleLauncherPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = launcherRef.current?.getBoundingClientRect();
    dragStateRef.current = {
      active: true,
      moved: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startRight: launcherPos.right,
      startBottom: launcherPos.bottom,
      width: rect?.width || 210,
      height: rect?.height || 52,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLauncherPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragStateRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > 6) {
      d.moved = true;
      setIsDraggingLauncher(true);
    }
    if (d.moved) {
      const maxRight = Math.max(8, window.innerWidth - d.width - 8);
      const maxBottom = Math.max(12, window.innerHeight - d.height - 68);
      const nextRight = Math.min(Math.max(8, d.startRight - dx), maxRight);
      const nextBottom = Math.min(Math.max(12, d.startBottom - dy), maxBottom);
      setLauncherPos({ right: nextRight, bottom: nextBottom });
      try {
        localStorage.setItem(
          'rm0_laxmi_launcher_pos',
          JSON.stringify({ right: nextRight, bottom: nextBottom })
        );
      } catch {
        // ignore storage errors
      }
    }
  };

  const handleLauncherPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragStateRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;
    d.active = false;
    d.pointerId = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDraggingLauncher(false);
    if (!d.moved) {
      setIsOpen(true);
    }
  };

  const [sessionId, setSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('rm0_laxmi_active_session_id');
    if (saved) return saved;
    const newId = `chat_${Date.now()}`;
    localStorage.setItem('rm0_laxmi_active_session_id', newId);
    return newId;
  });

  const [inputText, setInputText] = useState<string>('');
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  // Quick Pre-Chat Onboarding Form State (so user can see & fill Name, Phone, City, Enquiry immediately)
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('');
  const [formQuery, setFormQuery] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem('rm0_laxmi_widget_open', isOpen ? 'true' : 'false');
  }, [isOpen]);

  // Find or initialize current customer's persistent chat session
  const existingSession = liveChats.find((c) => c.id === sessionId);

  const resolvedDefaultCity =
    activeCustomer?.city ||
    (detectedCity && detectedCity !== 'All Over India' ? detectedCity : 'Mumbai, Maharashtra');

  const currentSession: LiveChatSession = existingSession || {
    id: sessionId,
    customerName: activeCustomer?.fullName || '',
    customerPhone: activeCustomer?.phone || '',
    customerEmail: activeCustomer?.email || '',
    city: resolvedDefaultCity,
    state: activeCustomer?.state || 'Maharashtra',
    ipAddress: detectedIp || 'Live IP',
    enquiryProduct: '',
    onboardingComplete: false,
    status: 'bot_onboarding',
    unreadForAdmin: 0,
    unreadForCustomer: 0,
    messages: [
      {
        id: 'msg_welcome_laxmi',
        sender: 'laxmi_bot',
        senderName: 'Laxmi Sharma (Rentmojo Live Support)',
        text: 'Namaste! Main Laxmi Sharma hu, Rentmojo Live Support se. Live chat shuru karne se pehle kripya apna Pura Naam, 10-Digit Mobile Number aur Product Enquiry niche form me bharein ya message type karein.',
        timestampIso: new Date().toISOString(),
      },
    ],
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
  };

  // Sync pre-chat form inputs when customer logs in or session updates
  useEffect(() => {
    if (currentSession.customerName && !formName) {
      setFormName(currentSession.customerName);
    } else if (activeCustomer?.fullName && !formName) {
      setFormName(activeCustomer.fullName);
    }
    if (currentSession.customerPhone && !formPhone) {
      setFormPhone(currentSession.customerPhone);
    } else if (activeCustomer?.phone && !formPhone) {
      setFormPhone(activeCustomer.phone);
    }
    if (!formCity) {
      setFormCity(currentSession.city || resolvedDefaultCity);
    }
  }, [
    currentSession.customerName,
    currentSession.customerPhone,
    currentSession.city,
    activeCustomer,
    resolvedDefaultCity,
    formName,
    formPhone,
    formCity,
  ]);

  // Determine which onboarding step Laxmi is on if onboardingComplete === false
  const getOnboardingStep = (
    sess: LiveChatSession
  ): 'ask_name' | 'ask_phone' | 'ask_query' | 'done' => {
    if (sess.onboardingComplete) return 'done';
    if (!sess.customerName || sess.customerName.trim().length < 2) return 'ask_name';
    if (!sess.customerPhone || sess.customerPhone.replace(/\D/g, '').length < 10) return 'ask_phone';
    return 'ask_query';
  };

  const currentStep = getOnboardingStep(currentSession);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (existingSession && existingSession.unreadForCustomer > 0) {
        onUpsertChatSession(
          {
            ...existingSession,
            unreadForCustomer: 0,
          },
          false
        );
      }
    }
  }, [isOpen, currentSession.messages.length, existingSession?.unreadForCustomer]);

  // Instant 1-Step Pre-Chat Form Submission (Laxmi Collects Name, Phone, City & Query)
  const handleStartChatWithForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    const cleanPhone = formPhone.replace(/\D/g, '').slice(-10);
    const cleanCity = formCity.trim() || resolvedDefaultCity;
    const cleanQuery = formQuery.trim() || 'Enquiry regarding iPhone 18 Pro / Laptop rental';

    if (cleanName.length < 2) {
      setFormError('Kripya apna Pura Naam (Full Name) enter karein.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setFormError('Kripya valid 10-digit Mobile Number enter karein.');
      return;
    }

    const nowIso = new Date().toISOString();
    const customerSummaryMsg: ChatMessageItem = {
      id: `m_cust_${Date.now()}`,
      sender: 'customer',
      senderName: cleanName,
      text: `Name: ${cleanName}\nMobile: +91 ${cleanPhone}\nCity: ${cleanCity}\nEnquiry: ${cleanQuery}`,
      timestampIso: nowIso,
    };

    const botConnectedMsg: ChatMessageItem = {
      id: `m_bot_${Date.now() + 1}`,
      sender: 'laxmi_bot',
      senderName: 'Laxmi Sharma (Rentmojo Live Support)',
      text: `Dhanyavaad ${cleanName} ji (+91 ${cleanPhone})! Maine aapki enquiry ("${cleanQuery}") humare Rentmojo Live Support Desk ko bhej di hai. Ab aap yahan seedha Live Chat kar sakte hain — page badalne ya reload karne par bhi aapki chat band nahi hogi!`,
      timestampIso: new Date().toISOString(),
    };

    setIsEditingProfile(false);

    await onUpsertChatSession(
      {
        ...currentSession,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerEmail: activeCustomer?.email || currentSession.customerEmail || '',
        city: cleanCity,
        ipAddress: detectedIp || currentSession.ipAddress || 'Live IP',
        enquiryProduct: cleanQuery.slice(0, 180),
        onboardingComplete: true,
        status: 'waiting_for_admin',
        unreadForAdmin: (currentSession.unreadForAdmin || 0) + 1,
        messages: [...currentSession.messages, customerSummaryMsg, botConnectedMsg],
        updatedAtIso: nowIso,
      },
      true
    );
  };

  // Step-by-step or Live Message Handler via Bottom Input
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    setInputText('');

    const nowIso = new Date().toISOString();
    const customerMsg: ChatMessageItem = {
      id: `m_cust_${Date.now()}`,
      sender: 'customer',
      senderName: currentSession.customerName || activeCustomer?.fullName || 'Customer',
      text,
      timestampIso: nowIso,
    };

    const nextMessages = [...currentSession.messages, customerMsg];

    if (currentStep === 'ask_name') {
      if (text.length < 2) {
        const retryMsg: ChatMessageItem = {
          id: `m_bot_${Date.now() + 1}`,
          sender: 'laxmi_bot',
          senderName: 'Laxmi Sharma (Rentmojo Live Support)',
          text: 'Kripya apna sahi Pura Naam (Full Name) enter karein (minimum 2 characters).',
          timestampIso: new Date().toISOString(),
        };
        await onUpsertChatSession(
          {
            ...currentSession,
            ipAddress: detectedIp || currentSession.ipAddress,
            messages: [...nextMessages, retryMsg],
            updatedAtIso: nowIso,
          },
          false
        );
        return;
      }

      setFormName(text);
      const botNext: ChatMessageItem = {
        id: `m_bot_${Date.now() + 1}`,
        sender: 'laxmi_bot',
        senderName: 'Laxmi Sharma (Rentmojo Live Support)',
        text: `Dhanyavaad ${text} ji! Ab kripya apna 10-Digit Mobile Number enter karein.`,
        timestampIso: new Date().toISOString(),
      };

      await onUpsertChatSession(
        {
          ...currentSession,
          customerName: text,
          ipAddress: detectedIp || currentSession.ipAddress,
          messages: [
            ...nextMessages.map((m) =>
              m.id === customerMsg.id ? { ...m, senderName: text } : m
            ),
            botNext,
          ],
          updatedAtIso: nowIso,
        },
        false
      );
      return;
    }

    if (currentStep === 'ask_phone') {
      const digits = text.replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) {
        const retryPhoneMsg: ChatMessageItem = {
          id: `m_bot_${Date.now() + 1}`,
          sender: 'laxmi_bot',
          senderName: 'Laxmi Sharma (Rentmojo Live Support)',
          text: 'Kripya valid 10-digit Mobile Number enter karein (jaise 9820112233).',
          timestampIso: new Date().toISOString(),
        };
        await onUpsertChatSession(
          {
            ...currentSession,
            messages: [...nextMessages, retryPhoneMsg],
            updatedAtIso: nowIso,
          },
          false
        );
        return;
      }

      setFormPhone(digits);
      const botAskQuery: ChatMessageItem = {
        id: `m_bot_${Date.now() + 1}`,
        sender: 'laxmi_bot',
        senderName: 'Laxmi Sharma (Rentmojo Live Support)',
        text: `Shukriya ${currentSession.customerName} ji (+91 ${digits})! Ab batayein aap kis product (iPhone 18 Pro, MacBook Pro, Laptop, PS5) ke baare me enquiry ya live baat karna chahte hain?`,
        timestampIso: new Date().toISOString(),
      };

      await onUpsertChatSession(
        {
          ...currentSession,
          customerPhone: digits,
          ipAddress: detectedIp || currentSession.ipAddress,
          messages: [...nextMessages, botAskQuery],
          updatedAtIso: nowIso,
        },
        false
      );
      return;
    }

    if (currentStep === 'ask_query') {
      const botConnectedMsg: ChatMessageItem = {
        id: `m_bot_${Date.now() + 1}`,
        sender: 'laxmi_bot',
        senderName: 'Laxmi Sharma (Rentmojo Live Support)',
        text: `Dhanyavaad ${currentSession.customerName} ji! Aapka Naam (${currentSession.customerName}), Mobile (+91 ${currentSession.customerPhone}), aur Enquiry humare Rentmojo Live Support Team ko connect ho gayi hai. Admin aapko yahi live reply karenge!`,
        timestampIso: new Date().toISOString(),
      };

      await onUpsertChatSession(
        {
          ...currentSession,
          enquiryProduct: text.slice(0, 180),
          onboardingComplete: true,
          status: 'waiting_for_admin',
          ipAddress: detectedIp || currentSession.ipAddress,
          unreadForAdmin: (currentSession.unreadForAdmin || 0) + 1,
          messages: [...nextMessages, botConnectedMsg],
          updatedAtIso: nowIso,
        },
        true
      );
      return;
    }

    // Live Chat Mode (Onboarding already complete — direct real-time Firebase message to Admin!)
    await onUpsertChatSession(
      {
        ...currentSession,
        status:
          currentSession.status === 'resolved' ? 'waiting_for_admin' : currentSession.status,
        ipAddress: detectedIp || currentSession.ipAddress,
        unreadForAdmin: (currentSession.unreadForAdmin || 0) + 1,
        messages: nextMessages,
        updatedAtIso: nowIso,
      },
      true
    );
  };

  const handleStartNewChat = () => {
    const freshId = `chat_${Date.now()}`;
    localStorage.setItem('rm0_laxmi_active_session_id', freshId);
    setSessionId(freshId);
    setFormQuery('');
    setIsEditingProfile(false);
  };

  return (
    <>
      {/* Expanded Persistent Chat Window — Full Mobile Responsive & Never Clipped */}
      {isOpen && (
        <div className="fixed inset-x-2.5 bottom-2.5 sm:inset-x-auto sm:bottom-4 sm:right-4 z-50 w-auto sm:w-[400px] h-[78vh] max-h-[560px] min-h-[380px] rounded-2xl bg-white border-2 border-slate-900 shadow-2xl flex flex-col overflow-hidden">
          {/* Top Agent Identity Header: Laxmi Name + Live Firebase Status + Admin Quick Link */}
          <div className="bg-slate-900 text-white px-3.5 py-3 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#DF2927] flex items-center justify-center font-extrabold text-sm text-white border border-white/30">
                  LS
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5 truncate">
                  <span>Laxmi Sharma</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-bold uppercase shrink-0">
                    Online
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onOpenAdminLiveChat && (
                <button
                  type="button"
                  onClick={onOpenAdminLiveChat}
                  title="Open Admin Live Chat Desk (/admin)"
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-[#DF2927] text-[10px] font-bold text-slate-200 hover:text-white flex items-center gap-1 transition-colors border border-slate-700"
                >
                  <Lock className="w-3 h-3" />
                  <span>Admin</span>
                </button>
              )}
              {currentSession.onboardingComplete && (
                <button
                  type="button"
                  onClick={handleStartNewChat}
                  title="Start New Enquiry"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimize Chat (Stays Active Across Pages)"
                className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-[#DF2927] transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Customer Name & Phone Live Identity Bar */}
          <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 text-[11px] text-slate-800 shrink-0">
            {currentSession.customerName && currentSession.customerPhone ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <span className="text-slate-500">You: </span>
                  <strong className="font-extrabold text-slate-900">
                    {currentSession.customerName}
                  </strong>
                  <span className="mx-1 text-slate-400">·</span>
                  <span className="font-mono font-bold text-teal-700">
                    +91 {currentSession.customerPhone}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <PhoneCall className="w-3.5 h-3.5 text-[#DF2927] shrink-0" />
                <span>Enter Name & Phone below to connect with Admin</span>
              </div>
            )}

            {currentSession.onboardingComplete && (
              <button
                type="button"
                onClick={() => setIsEditingProfile((prev) => !prev)}
                className="text-[10px] font-bold text-[#DF2927] hover:underline flex items-center gap-0.5 shrink-0"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingProfile ? 'Close' : 'Edit Name'}</span>
              </button>
            )}
          </div>

          {/* Messages & Pre-Chat Form Stream */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#F8FAFC]">
            {currentSession.messages.map((msg) => {
              const isCust = msg.sender === 'customer';
              const isAdmin = msg.sender === 'admin';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isCust ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] font-extrabold text-slate-600 mb-1 px-1 flex items-center gap-1">
                    {isCust
                      ? `${currentSession.customerName || msg.senderName || 'You'} (Customer)`
                      : isAdmin
                      ? 'Rentmojo Live Admin'
                      : 'Laxmi Sharma · Live Support'}
                  </span>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                      isCust
                        ? 'bg-[#DF2927] text-white rounded-br-xs'
                        : isAdmin
                        ? 'bg-slate-900 text-white border-2 border-teal-400 rounded-bl-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {isAdmin && (
                      <div className="text-[10px] font-mono font-bold text-teal-300 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Official Admin Live Reply</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                    {new Date(msg.timestampIso).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })}

            {/* Interactive Pre-Chat Onboarding Card (Shown Before Chat Starts or When Editing Details) */}
            {(!currentSession.onboardingComplete || isEditingProfile) && (
              <form
                onSubmit={handleStartChatWithForm}
                className="p-3.5 rounded-xl bg-white border-2 border-[#DF2927]/30 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#DF2927]" />
                    <span>Laxmi Pre-Chat Customer Details</span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-teal-700">
                    Instant Admin Connect
                  </span>
                </div>

                {formError && (
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] font-semibold text-red-700">
                    {formError}
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      Aapka Pura Naam (Full Name) *
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        10-Digit Mobile No. *
                      </label>
                      <input
                        type="tel"
                        value={formPhone}
                        onChange={(e) =>
                          setFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                        }
                        placeholder="9876543210"
                        maxLength={10}
                        required
                        className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        City / Area
                      </label>
                      <input
                        type="text"
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        placeholder="Pune / Mumbai"
                        className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                      />
                    </div>
                  </div>

                  {!isEditingProfile && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Aapki Enquiry (Product / Question) *
                      </label>
                      <input
                        type="text"
                        value={formQuery}
                        onChange={(e) => setFormQuery(e.target.value)}
                        placeholder="e.g. Need iPhone 18 Pro 256GB on 12M rent"
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#DF2927] focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-3 rounded-lg bg-[#DF2927] hover:bg-[#c92221] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isEditingProfile
                      ? 'Save Updated Name & Mobile Number'
                      : 'Submit Details & Start Live Chat'}
                  </span>
                </button>
              </form>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                currentStep === 'ask_name'
                  ? 'Or type your Full Name here...'
                  : currentStep === 'ask_phone'
                  ? 'Type your 10-digit Mobile Number...'
                  : currentStep === 'ask_query'
                  ? 'Type your Product Enquiry...'
                  : `Message Live Admin as ${currentSession.customerName || 'Customer'}...`
              }
              className="flex-1 px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-[#DF2927] focus:outline-none"
            />
            <button
              type="submit"
              className="px-3.5 py-2.5 rounded-xl bg-[#DF2927] hover:bg-[#c92221] text-white font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* Moveable Floating Launcher Pill (Positioned Higher Up & Freely Draggable on Mobile/Desktop) */}
      {!isOpen && (
        <div
          ref={launcherRef}
          style={{
            right: `${launcherPos.right}px`,
            bottom: `${launcherPos.bottom}px`,
          }}
          className="fixed z-50"
        >
          <button
            type="button"
            onPointerDown={handleLauncherPointerDown}
            onPointerMove={handleLauncherPointerMove}
            onPointerUp={handleLauncherPointerUp}
            onPointerCancel={handleLauncherPointerUp}
            title="Tap to open chat · Drag to move anywhere"
            className={`touch-none select-none pl-2.5 pr-3.5 py-2.5 sm:pl-3 sm:pr-4 sm:py-3 rounded-full bg-[#DF2927] hover:bg-[#c92221] text-white shadow-2xl border-2 border-white flex items-center gap-2 transition-shadow ${
              isDraggingLauncher
                ? 'cursor-grabbing scale-105 ring-4 ring-[#DF2927]/30'
                : 'cursor-grab hover:scale-[1.03]'
            }`}
          >
            <GripVertical className="w-3.5 h-3.5 text-white/75 shrink-0" />
            <div className="relative shrink-0">
              <MessageSquare className="w-5 h-5" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#DF2927] absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-left">
              <div className="text-xs font-extrabold leading-none">
                Laxmi · Live Chat
              </div>
              <div className="text-[10px] text-red-100 leading-none mt-0.5">
                {currentSession.customerName
                  ? `${currentSession.customerName} · Drag to Move`
                  : '24x7 Support · Drag to Move'}
              </div>
            </div>
            {currentSession.unreadForCustomer > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-extrabold tabular-nums">
                {currentSession.unreadForCustomer} New
              </span>
            )}
          </button>
        </div>
      )}
    </>
  );
};
