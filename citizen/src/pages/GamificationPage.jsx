import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Target, Zap, Star, Award, Brain, Shield, Coins, User, ChevronRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ProfileCard({ profile }) {
  if (!profile) return null;
  const xpForNext = profile.xp_to_next_level || 1000;
  const xpPct = Math.min(100, (profile.xp / xpForNext) * 100);

  return (
    <div className="bg-gradient-to-br from-[#4edea3]/[0.08] to-[#5de6ff]/[0.04] rounded-2xl p-5 border border-[#4edea3]/15 shadow-xl shadow-black/40">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4edea3] to-[#5de6ff] flex items-center justify-center shadow-lg shadow-[#4edea3]/20">
          <span className="text-3xl font-black text-black" style={{ fontFamily: 'Space Grotesk' }}>{profile.level}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{profile.name}</h3>
          <p className="text-xs text-white/40">Level {profile.level} · {profile.total_reports} reports</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-[#ffa94d]">
            <Coins className="w-5 h-5" />
            <span className="text-2xl font-bold">{profile.coins}</span>
          </div>
        </div>
      </div>

      {/* XP bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-[#4edea3] font-bold">{profile.xp} XP</span>
          <span className="text-white/25">{xpForNext} to Lv.{profile.level + 1}</span>
        </div>
        <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#4edea3] to-[#5de6ff]"
            initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 1.2 }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: profile.streak_days, label: 'Day Streak', icon: '🔥' },
          { value: profile.achievements?.length || 0, label: 'Badges', icon: '🏅' },
          { value: profile.total_reports, label: 'Reports', icon: '📸' },
        ].map((s, i) => (
          <div key={i} className="text-center bg-white/[0.04] rounded-xl py-4 border border-white/[0.06]">
            <span className="text-lg">{s.icon}</span>
            <div className="text-xl font-bold text-white mt-1">{s.value}</div>
            <div className="text-[10px] text-white/30 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllAchievements({ earned, allAchievements }) {
  return (
    <div className="space-y-4 mt-8">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Award className="w-4 h-4 text-[#ffa94d]" /> Achievements
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {allAchievements.map((a, i) => {
          const isEarned = earned?.includes(a.id);
          return (
            <motion.div key={a.id} className={`p-4 rounded-xl text-center border transition-all ${
              isEarned ? 'bg-[#ffa94d]/[0.06] border-[#ffa94d]/20 shadow-lg shadow-black/30' : 'bg-white/[0.015] border-white/[0.04] opacity-40'
            }`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: isEarned ? 1 : 0.4, scale: 1 }} transition={{ delay: i * 0.03 }}>
              <p className="text-2xl mb-1.5">{a.name.split(' ')[0]}</p>
              <p className="text-[11px] font-bold text-white">{a.name.split(' ').slice(1).join(' ')}</p>
              <p className="text-[9px] text-white/30 mt-1 leading-relaxed">{a.desc}</p>
              {isEarned && <p className="text-[9px] text-[#4edea3] mt-2 font-bold">✓ Earned</p>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Leaderboard({ data }) {
  if (!data?.length) return <p className="text-sm text-white/30 text-center py-10">No players yet. Be the first!</p>;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-2.5">
      {/* Top 3 podium */}
      {data.length >= 3 && (
        <div className="flex items-end justify-center gap-2 mb-8 pt-2">
          {[data[1], data[0], data[2]].map((e, i) => {
            const heights = ['h-24', 'h-28', 'h-20'];
            const rank = [2, 1, 3][i];
            const rankStyles = [
              'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 shadow-slate-300/30',
              'bg-gradient-to-br from-[#ffd76b] to-[#ff9f1c] text-[#3a1d00] shadow-[#ffa94d]/40',
              'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50 shadow-amber-700/30',
            ];
            const bgs = ['from-slate-400/[0.06]', 'from-[#ffa94d]/[0.14]', 'from-amber-700/[0.08]'];
            const borders = ['border-slate-400/15', 'border-[#ffa94d]/30', 'border-amber-700/20'];
            return (
              <motion.div key={rank} className={`flex-1 ${heights[i]} rounded-t-2xl bg-gradient-to-t ${bgs[i]} to-transparent border border-b-0 ${borders[i]} flex flex-col items-center px-2 pt-5 pb-2 relative`}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
                <div className={`w-9 h-9 rounded-full ${rankStyles[i]} flex items-center justify-center font-black text-sm shadow-lg mb-2`} style={{ fontFamily: 'Space Grotesk' }}>
                  {rank}
                </div>
                <p className="text-[11px] font-bold text-white truncate w-full text-center">{e.name.split(' ')[0]}</p>
                <p className="text-[10px] text-[#4edea3] font-bold mt-0.5">{e.xp} XP</p>
                <div className="flex-1" />
                <span className="text-[9px] text-white/40 font-bold tracking-wider">LV.{e.level}</span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      {data.map((entry, i) => (
        <motion.div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
          i < 3 ? 'bg-[#ffa94d]/[0.03]' : 'bg-white/[0.02]'
        }`} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
          <div className="w-7 text-center shrink-0">
            {i < 3 ? <span className="text-lg">{medals[i]}</span> : <span className="text-xs text-white/25 font-bold">#{entry.rank}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{entry.name}</p>
            <p className="text-[10px] text-white/25">{entry.total_reports} rpts · 🔥{entry.streak_days}d</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-[#4edea3]">{entry.xp}</p>
            <p className="text-[9px] text-white/20">Lv.{entry.level}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function Challenges({ data }) {
  if (!data?.length) return <p className="text-sm text-white/30 text-center py-10">No challenges today</p>;

  return (
    <div className="space-y-3">
      {data.map((c, i) => (
        <motion.div key={c.id} className={`p-4 rounded-xl border ${
          c.completed ? 'bg-[#4edea3]/[0.04] border-[#4edea3]/15' : 'bg-white/[0.02] border-white/[0.04]'
        }`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-sm font-semibold text-white">{c.name}</p>
            {c.completed ? <span className="text-xs text-[#4edea3] font-bold px-2 py-0.5 rounded-full bg-[#4edea3]/10">✓ Done</span> :
              <span className="text-xs text-white/30">{c.progress}/{c.target}</span>}
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#4edea3] to-[#5de6ff] transition-all duration-700"
              style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-white/25">
            <span>🎯 +{c.xp} XP</span><span>💰 +{c.coins} coins</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AIChallenge({ userId }) {
  const [round, setRound] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState({ played: 0, accuracy: 0 });

  const loadRound = async () => {
    setSelected(null); setResult(null); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/gamification/ai-challenge`);
      setRound(await res.json());
    } catch {}
    setLoading(false);
  };

  const submitAnswer = async (answer) => {
    setSelected(answer);
    try {
      const fd = new FormData();
      fd.append('user_id', userId);
      fd.append('answer', answer);
      fd.append('correct_answer', round.correct_answer);
      const res = await fetch(`${API_URL}/gamification/ai-challenge/answer`, { method: 'POST', body: fd });
      const data = await res.json();
      setResult(data);
      setScore({ played: data.total_played, accuracy: data.accuracy });
    } catch {}
  };

  useEffect(() => { loadRound(); }, []);

  if (loading) return <div className="text-center py-16"><div className="w-8 h-8 border-2 border-[#4edea3] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      {score.played > 0 && (
        <div className="flex gap-3 mb-2">
          <div className="flex-1 bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-[#4edea3]">{score.accuracy}%</div>
            <div className="text-[9px] text-white/25">Accuracy</div>
          </div>
          <div className="flex-1 bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-white">{score.played}</div>
            <div className="text-[9px] text-white/25">Played</div>
          </div>
        </div>
      )}

      {round && (
        <>
          {/* Scenario card — big and visible */}
          <div style={{ background: '#1e1b2e', border: '1px solid #3b2d6b', borderRadius: 16, padding: 24 }}>
            <p style={{ fontSize: 11, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>🤖 IDENTIFY THE DAMAGE</p>
            <p style={{ fontSize: 18, color: '#e5e1e4', fontWeight: 600, lineHeight: 1.5 }}>"{round.scenario}"</p>
          </div>

          {/* Options — 2x2 grid with big tap targets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {round.options.map((opt) => {
              const isSelected = selected === opt;
              const isCorrect = result && opt === round.correct_answer;
              const isWrong = result && isSelected && !result.correct;
              const bg = isCorrect ? '#0d3320' : isWrong ? '#3d1515' : isSelected ? '#152535' : '#1c1b1d';
              const border = isCorrect ? '#4edea3' : isWrong ? '#ff6b6b' : isSelected ? '#5de6ff' : '#2a2a2c';
              const color = isCorrect ? '#4edea3' : isWrong ? '#ff6b6b' : isSelected ? '#5de6ff' : '#bbcabf';
              return (
                <motion.button key={opt} onClick={() => !result && submitAnswer(opt)} disabled={!!result}
                  style={{ background: bg, border: `2px solid ${border}`, borderRadius: 14, padding: '18px 16px', textAlign: 'left', fontSize: 14, fontWeight: 600, color, cursor: result ? 'default' : 'pointer' }}
                  whileTap={!result ? { scale: 0.97 } : {}}>
                  {opt} {isCorrect ? ' ✓' : ''}{isWrong ? ' ✗' : ''}
                </motion.button>
              );
            })}
          </div>

          {/* Result */}
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: result.correct ? '#0d3320' : '#3d1515', borderRadius: 14, padding: 20, textAlign: 'center', border: `1px solid ${result.correct ? '#4edea355' : '#ff6b6b55'}` }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: result.correct ? '#4edea3' : '#ff6b6b' }}>
                {result.correct ? '🎉 Correct!' : '❌ Wrong!'}
              </p>
              <p style={{ fontSize: 13, color: '#bbcabf88', marginTop: 6 }}>
                {result.correct ? '+50 XP earned' : `Answer was: ${result.correct_answer}`}
              </p>
            </motion.div>
          )}

          {/* Next round button */}
          {result && (
            <motion.button onClick={loadRound} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ width: '100%', padding: '16px 0', borderRadius: 14, background: 'linear-gradient(135deg, #4edea3, #10b981)', color: '#002113', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
              Next Round →
            </motion.button>
          )}
        </>
      )}
    </div>
  );
}

export default function GamificationPage({ userName }) {
  const userId = userName || 'Citizen';
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);

  useEffect(() => {
    const encodedId = encodeURIComponent(userId);
    Promise.all([
      fetch(`${API_URL}/gamification/profile/${encodedId}`).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/gamification/leaderboard`).then(r => r.json()).catch(() => ({ leaderboard: [] })),
      fetch(`${API_URL}/gamification/challenges/${encodedId}`).then(r => r.json()).catch(() => ({ challenges: [] })),
      fetch(`${API_URL}/gamification/achievements`).then(r => r.json()).catch(() => ({ achievements: [] })),
    ]).then(([p, l, c, a]) => {
      setProfile(p);
      setLeaderboard(l?.leaderboard || []);
      setChallenges(c?.challenges || []);
      setAllAchievements(a?.achievements || []);
    });
  }, [userId]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'leaderboard', label: 'Rank', icon: Trophy },
    { id: 'challenges', label: 'Quests', icon: Target },
    { id: 'ai', label: 'AI Game', icon: Brain },
  ];

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 text-center">
        <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
          🏆 Pothole Hunter
        </h1>
        <p className="text-xs text-white/40 mt-1">Earn XP, coins & badges by reporting damage</p>
      </div>

      <div className="px-5 pb-8">
        {/* Tab selector */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl text-xs font-bold transition-all border ${
                tab === t.id
                  ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/20'
                  : 'bg-white/[0.03] text-white/40 border-transparent active:bg-white/[0.06]'
              }`}>
              <t.icon className="w-5 h-5" />
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProfileCard profile={profile} />
              <AllAchievements earned={profile?.achievements} allAchievements={allAchievements} />
            </motion.div>
          )}
          {tab === 'leaderboard' && (
            <motion.div key="lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Leaderboard data={leaderboard} />
            </motion.div>
          )}
          {tab === 'challenges' && (
            <motion.div key="ch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-[#5de6ff]" /> Today's Challenges
              </h3>
              <Challenges data={challenges} />

              {/* Weekly goal */}
              <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.04]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-white">📅 Weekly Goal</p>
                  <span className="text-xs text-[#4edea3] font-bold">3/20 reports</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden mb-2">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#4edea3] to-[#5de6ff]" style={{ width: '15%' }} />
                </div>
                <p className="text-[10px] text-white/25">Complete 20 reports this week for +500 XP & +100 coins</p>
              </div>

              {/* Tip card */}
              <div className="bg-gradient-to-br from-violet-500/[0.04] to-[#5de6ff]/[0.03] rounded-xl p-5 border border-violet-500/10">
                <p className="text-sm text-violet-400 font-bold mb-3">💡 Pro Tips</p>
                <div className="space-y-3">
                  {[
                    { icon: '🔍', tip: 'Report in different areas to earn the Inspector badge' },
                    { icon: '⚡', tip: 'Upload 3 reports in 1 hour for Fast Reporter' },
                    { icon: '🔥', tip: 'Maintain a daily streak for bonus XP multipliers' },
                    { icon: '✅', tip: 'Verify other reports to earn the Verifier badge' },
                    { icon: '🤖', tip: 'Play AI Challenge to earn the AI Master badge' },
                  ].map((t, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                      <span className="text-base">{t.icon}</span>
                      <p className="text-xs text-white/40">{t.tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rewards breakdown */}
              <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.04]">
                <p className="text-sm font-bold text-white mb-3">🎁 Points System</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { action: 'Critical pothole', pts: '+15', color: '#ff6b6b' },
                    { action: 'Pothole report', pts: '+10', color: '#ffa94d' },
                    { action: 'Crack report', pts: '+7', color: '#5de6ff' },
                    { action: 'Minor damage', pts: '+5', color: '#4edea3' },
                    { action: 'False report', pts: '-5', color: '#ff6b6b' },
                    { action: 'Verification', pts: '+3', color: '#4edea3' },
                    { action: 'Streak bonus/day', pts: '+5', color: '#ffa94d' },
                    { action: 'AI challenge win', pts: '+10', color: '#5de6ff' },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                      <span className="text-[11px] text-white/40">{r.action}</span>
                      <span className="text-xs font-bold" style={{ color: r.color }}>{r.pts}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {tab === 'ai' && (
            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-violet-400" /> AI Challenge
                </h3>
                <span className="text-xs text-white/25">Test your knowledge</span>
              </div>
              <AIChallenge userId={userId} />
              {/* How it works card */}
              <div style={{ background: '#1c1b1d', borderRadius: 14, padding: 24, border: '1px solid #2a2a2c' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#e5e1e4', marginBottom: 16 }}>How it works</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  {[
                    { step: '1', title: 'Read', desc: 'AI describes a damage scenario', color: '#4edea3' },
                    { step: '2', title: 'Guess', desc: 'Pick the correct damage type', color: '#5de6ff' },
                    { step: '3', title: 'Earn', desc: '+50 XP for correct answers', color: '#ffa94d' },
                  ].map(s => (
                    <div key={s.step} style={{ textAlign: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${s.color}15`, color: s.color, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{s.step}</div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#e5e1e4' }}>{s.title}</p>
                      <p style={{ fontSize: 11, color: '#bbcabf66', marginTop: 4 }}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats card */}
              <div style={{ background: '#1c1b1d', borderRadius: 14, padding: 24, border: '1px solid #2a2a2c' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#e5e1e4', marginBottom: 16 }}>🏆 Earn Rewards</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Correct', value: '+50 XP', color: '#4edea3' },
                    { label: 'Wrong', value: '-10 XP', color: '#ff6b6b' },
                    { label: '80%+ Accuracy', value: '🤖 AI Master badge', color: '#ffa94d' },
                  ].map((r, i) => (
                    <div key={i} style={{ textAlign: 'center', background: '#13131588', borderRadius: 10, padding: 12 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: r.color }}>{r.value}</p>
                      <p style={{ fontSize: 10, color: '#bbcabf44', marginTop: 4 }}>{r.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
