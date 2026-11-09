// English copy for the year-by-year zodiac pages (/en/shengxiao/<sign>/<year>).
//
// Structure (which year relates to which branch) stays in shengxiaoData and
// shengxiaoEn.yearNotesEn; this module only holds the English language layer.
//
// Rule: no CJK here. Relation keys mirror yearNotesEn (zhi/chong/hai/xing/he/neutral),
// i.e. the same six relations as the Chinese LiunianAnalysis (value, clash, harm,
// punishment, harmony, neutral).
import type { ShengXiao } from './shengxiaoData'
import { yearNotesEn, type RelationKey, type ToneKey } from './shengxiaoEn'

export interface LiunianEnCopy {
  year: number
  ganZhi: string
  relation: RelationKey
  relationText: string
  tone: ToneKey
  toneText: string
  isFanTaiSui: boolean
  summary: string
  overview: string
  career: string
  wealth: string
  relationship: string
  health: string
  advice: string
  taisui: string
  decision: string
}

interface RelationCopy {
  summary: string
  overview: string
  career: string
  wealth: string
  relationship: string
  health: string
  advice: string
  taisui: string
  decision: string
}

export const RELATION_COPY_EN: Record<RelationKey, RelationCopy> = {
  zhi: {
    summary:
      'The annual branch meets the sign’s own branch — the traditional benming year, read as a reset rather than a punishment.',
    overview:
      'A benming year is a year of return, not a verdict. The annual branch repeats the sign’s own branch, so the familiar turns up in unfamiliar forms: a role that suddenly needs redefining, a home that needs reorganising, a relationship that asks for a clearer answer. Change sits close to the surface. The year rewards maintenance over expansion — finish what already exists before adding anything new.',
    career:
      'Work favours consolidation. Deepen the current position rather than making a dramatic jump; if a move is unavoidable, prepare the ground slowly and keep a cash cushion. Office friction is more likely than open conflict, so keep written trails and avoid public arguments.',
    wealth:
      'Money is steady rather than spectacular. Avoid large investments, guarantees and loans to friends, and save for costs that appear without warning. A simple budget and a fixed emergency fund do more this year than any clever trade.',
    relationship:
      'Small irritations carry more weight this year. Say the difficult thing early and kindly instead of letting it collect. Single people may find that nothing dramatic happens, which is fine — friendship and patience matter more than a quick attachment.',
    health:
      'Treat rest as part of the schedule. Traffic, adventure sports and late nights deserve extra care. A routine check-up, a regular bedtime and a short daily walk are the practical responses; the ritual side — wearing red, visiting a temple — is for peace of mind.',
    advice:
      'The keyword is steadiness. Make no irreversible decisions in a hurry, keep promises small and keep them, and build a reserve of money, sleep and goodwill. A quiet benming year that ends with everything intact is a successful one.',
    taisui:
      'Yes. The annual branch matches the sign’s own branch, the traditional benming year. It marks a reset more than a punishment: changes are easier to notice, and big decisions benefit from a second look.',
    decision:
      'This is a year for careful, staged moves rather than a single leap. Marriage, a job change or a new business can work if the groundwork is already there, but each one deserves a written plan, a fallback and a night’s sleep before the answer.',
  },
  chong: {
    summary:
      'The annual branch opposes the sign’s branch, the classic clash year — associated with movement, travel and changed plans.',
    overview:
      'A clash year is a moving year. Travel, relocation, job changes and shifts in close relationships all become more likely, and plans made early may need revising. Movement is not automatically bad: a change you choose and prepare for usually lands better than one that is forced on you.',
    career:
      'Expect restructuring, transfers or a tempting exit. Decide what you actually want before the offer arrives and keep your skills current. It is a good year for training, a sideways move that broadens experience or a planned sabbatical — and a poor year for impulsive resignations.',
    wealth:
      'Money moves in and out quickly. Avoid leverage, guarantees and deals whose terms you cannot explain. Contracts, invoices and shared accounts deserve a second read. Income tied to travel, logistics or international work can do better than usual.',
    relationship:
      'Couples may spend time apart or argue over arrangements; clear calendars and honest expectations help. Some clash years bring a wedding or a child rather than a break-up. Single people meet more people, but not everyone who arrives is staying.',
    health:
      'Watch traffic, sports injuries and the kind of exhaustion that comes from constantly changing plans. Sleep is the first thing to protect. Build recovery into the week instead of waiting for a holiday.',
    advice:
      'The keyword is direction. Choose the change instead of waiting to be pushed, keep a reserve and review plans every quarter. A clash year handled deliberately often produces the most visible progress.',
    taisui:
      'Yes. The annual branch directly opposes the sign’s branch, the classic clash year. It is associated with movement — travel, relocation, job change — rather than with unavoidable misfortune.',
    decision:
      'Change is likely whether or not you plan it, so plan it. A marriage, relocation or new venture is easier to carry when you set the timetable yourself. Avoid gambling a large sum or signing a contract you have not read twice.',
  },
  hai: {
    summary:
      'The annual branch forms a harm relation with the sign’s branch — quiet friction, small misunderstandings and the need for clear boundaries.',
    overview:
      'A harm year works quietly. Instead of a dramatic break, small misunderstandings accumulate: a favour misread, a partner who changes terms, a colleague who takes credit. Nothing looks serious until several small things line up, which is why patience and clear records matter more than bold moves.',
    career:
      'Keep agreements in writing and avoid taking on work outside your brief. Office politics are best left alone; do the job well and let the results speak. If a collaboration feels vague, ask for specifics before committing time.',
    wealth:
      'The main risk is money lost through trust — a loan to a friend, a guarantee, an informal partnership. Read contracts closely and decline anything that depends on someone else’s promise. Ordinary salary income remains stable.',
    relationship:
      'Misunderstandings are easy and suspicions are expensive. Say what you mean, ask instead of assuming, and keep clear boundaries with people outside the relationship. Single people should take their time before trusting a charming story.',
    health:
      'Small complaints are worth treating early rather than enduring. Sleep and mood are linked this year, so talk to someone you trust instead of holding everything in. Gentle exercise and regular meals help more than drastic changes.',
    advice:
      'The keyword is care. Keep promises specific, keep accounts separate and keep difficult conversations short and honest. Protect your time and your reputation; the year is easier when you are not trying to win every exchange.',
    taisui:
      'Yes. The annual branch forms a harm relation with the sign’s branch. It is a quieter kind of friction than a clash: misunderstandings, small losses and the need for clear boundaries.',
    decision:
      'Be deliberate rather than suspicious. Marriage, a job move or a business can proceed if the terms are clear and the other people are reliable. Put important agreements in writing and give yourself time before saying yes.',
  },
  xing: {
    summary:
      'The annual branch is in a punishment relation with the sign’s branch — friction with rules, paperwork and repeated disputes.',
    overview:
      'A punishment year brings friction with rules, authority and sometimes the law. Delays, repeated discussions and arguments that circle back are common. The useful response is order: keep documents in place, follow procedures and refuse to be drawn into other people’s disputes.',
    career:
      'Work can feel like wading through process. Follow the official route even when a shortcut is offered, and keep records of instructions and approvals. Disagreements with managers are best handled calmly and in private; a written summary afterwards protects everyone.',
    wealth:
      'Avoid disputes over money, ambiguous investments and anything with legal exposure. Conservative choices are not exciting, but they keep the year clean. Check contracts, tax and shared expenses carefully.',
    relationship:
      'Arguments can escalate because both sides feel they are right. Decide to be kind rather than correct, apologise when you are wrong and pause before sending the message you will regret. Avoid making permanent decisions during a heated week.',
    health:
      'Sharp tools, traffic and chronic conditions deserve respect this year. Keep appointments with doctors, take prescribed medicine on time and build rest into the week. Stress shows up in the body first.',
    advice:
      'The keyword is harmony. Slow the pace, follow the rules and let small disagreements go. A year without a major dispute is a year well spent.',
    taisui:
      'Yes. The annual branch is in a punishment relation with the sign’s branch. Traditionally it points to friction, paperwork and disputes rather than to a fixed outcome.',
    decision:
      'Take the slower route. Marriage and job changes are possible, but only with clear terms, correct paperwork and honest conversation. Postpone irreversible decisions until the emotional temperature has dropped.',
  },
  he: {
    summary:
      'The annual branch is in a harmony relation with the sign’s branch — a supportive year for cooperation, relationships and visible progress.',
    overview:
      'A harmony year is one of the better years for cooperation. Help arrives from people you already know, introductions lead somewhere, and projects that stalled begin to move. The risk is saying yes to too much, because the year makes almost everything sound possible.',
    career:
      'This is a good year for partnerships, promotions and public-facing work. Ask for the introduction, apply for the role, propose the collaboration. Choose commitments by capacity rather than by flattery, and make sure the credit and the workload are shared fairly.',
    wealth:
      'Income improves through networks and cooperation. Shared ventures can do well when the terms are written down. Still read contracts and avoid lending simply because the relationship is warm; harmony is not the same as unlimited trust.',
    relationship:
      'Warmth and goodwill make this a strong year for marriage, engagement or deepening a partnership. Single people are more likely to meet someone through friends or work. Existing couples should enjoy the ease without ignoring the small issues.',
    health:
      'Overall energy is good, but a busy social calendar can quietly wear you down. Watch food and alcohol at gatherings, keep a regular bedtime where possible and do not mistake feeling well for needing no rest.',
    advice:
      'The keyword is leverage. Use the goodwill of the year deliberately: ask for help, build the team, sign the agreement. Goodwill is a resource that grows when it is used honestly.',
    taisui:
      'No. The sign is in a harmony relation with the annual branch, not in conflict with it. Traditionally this is a supportive year for cooperation, relationships and visible progress.',
    decision:
      'Yes, with normal caution. This is one of the better years for marriage, a job move or a new business, provided the terms are clear and the people involved are reliable. Momentum is on your side; use it deliberately.',
  },
  neutral: {
    summary:
      'There is no direct clash, harm, punishment or harmony between the sign’s branch and the annual branch — an ordinary, stable year.',
    overview:
      'A neutral year is a working year. Nothing external pushes hard in either direction, so progress depends on the plans you bring to it. That is an advantage: it is easier to build quietly, learn something new and prepare for a busier season ahead.',
    career:
      'Steady progress is realistic. Finish projects, improve a skill and strengthen relationships with colleagues. A big jump is not required and may not be rewarded; the return on a year of consistent work tends to appear later.',
    wealth:
      'Income and spending are broadly stable. This is a good year for long-term saving, regular investing and tidying up financial arrangements. Avoid chasing excitement in the markets simply because life feels quiet.',
    relationship:
      'Relationships settle into routine. Pay attention to the ordinary things — meals together, honest check-ins, shared plans — because routine can drift into distance if nobody tends it. Single people may need to create opportunities rather than wait.',
    health:
      'There is no special alarm this year, which makes it a good time to build habits that pay off later: sleep, movement, food and the check-up you have been postponing. Consistency beats intensity.',
    advice:
      'The keyword is preparation. Keep the schedule, save the surplus, learn the skill and stay in touch with people who matter. A quiet year spent well gives the next one something to build on.',
    taisui:
      'No. There is no direct clash, harm, punishment or harmony relation between the sign’s branch and the annual branch this year. Traditionally it reads as an ordinary, stable year rather than a Tai Sui year.',
    decision:
      'There is room to decide on your own terms. Marriage, a job change or a new business can proceed if the practical case is sound. Because the year offers no strong push either way, the quality of your planning matters more than timing.',
  },
}

/** One year of English copy for a sign; relation computed by yearNotesEn (same table as the Chinese data). */
export function getLiunianEn(sx: ShengXiao, year: number): LiunianEnCopy {
  const note = yearNotesEn(sx, [year])[0]
  const copy = RELATION_COPY_EN[note.relation]
  return {
    year,
    ganZhi: note.ganZhi,
    relation: note.relation,
    relationText: note.relationText,
    tone: note.tone,
    toneText: note.toneText,
    isFanTaiSui: note.relation === 'zhi' || note.relation === 'chong' || note.relation === 'hai' || note.relation === 'xing',
    ...copy,
  }
}

/**
 * 2027 (Ding-Wei) sign-specific landing notes.
 * Mirrors LIUNIAN_2027_DETAIL in shengxiaoData.ts so the English 2027 pages keep
 * the same section as zh/tw instead of silently dropping it.
 */
export const LIUNIAN_2027_DETAIL_EN: Record<string, { focus: string; action: string }> = {
  shu: {
    focus:
      'For the Rat, 2027 is a Zi–Wei harm year. A harm year rarely shows up as open conflict; it drains quietly — a partner changes terms at the last minute, an introduction from a friend falls through, a good intention is misread. Ding fire is exposed this year, and because the Rat is a water sign, water meeting fire makes moods rise and fall more noticeably than usual. A careless remark can stay on your mind for days.',
    action:
      'The most valuable habit this year is keeping records. Put verbal promises in writing, and spell out exit terms in partnerships and loans. Avoid acting as the middleman and avoid guaranteeing anyone. A Zi–Wei harm often surfaces at home or in the health of elders; two extra phone calls do more than an extra gift.',
  },
  niu: {
    focus:
      'For the Ox, 2027 brings both a clash and a punishment with the annual branch — the most tangled relationship of the twelve signs. A clash means movement; a punishment means friction. Together they read as change wrapped in complication. Ding is yin fire and Chou is damp earth; fire and earth scorch each other, so projects tend to start in a hurry and stall halfway.',
    action:
      'Turn passive change into deliberate change. If you have been thinking about a transfer, a move or further study, set your own timetable instead of waiting to be pushed. In a clash-and-punishment year, never meet force with force, especially with managers, elders or a partner — cool the room before discussing the issue. Check contracts and accounts line by line, even when it feels tedious.',
  },
  hu: {
    focus:
      'For the Tiger, 2027 carries no clash, harm, punishment or combination with the annual branch: a steady year, but not an empty one. Ding-Wei is dry fire and dry earth, and the Tiger is wood; dry earth drains wood, so the feeling is one of pushing without quite gaining traction. Plans move, then lose momentum. Outside opportunities are modest and the pace is inward.',
    action:
      'A steady year is for storing energy. Push long-term projects forward, fill skill gaps, and look after your health. Do not change direction just because nothing dramatic is happening — wood in dry earth suffers most from being pulled up again and again. Volunteer for one cross-team or external collaboration and leave a door open for 2028.',
  },
  tu: {
    focus:
      'For the Rabbit, 2027 forms a Hai–Mao–Wei three-combination with the annual branch, one of the harmony group. People and partnerships are the main theme. Ding fire is the Rabbit’s output element, so the urge to express, write and make things rises; this is a good year to turn ideas into finished work. The same ease creates a trap: when relationships are smooth, it is easy to agree to more than you can carry.',
    action:
      'Put the combination to concrete use — negotiate partnerships, find collaborators, move a relationship forward, grow the client base. Success rates are higher than usual. But before every yes, count the time and the cost; whether the connection becomes support or burden depends on the boundary you set. Money follows the network: earned income is stable, so do not spend for appearances.',
  },
  long: {
    focus:
      'For the Dragon, 2027 has no strong tie to the annual branch: a steady year. Chen is damp earth, Wei is dry earth; two earths together make the theme accumulation — many tasks, heavy responsibility, slow progress. Ding fire feeds earth, which helps the Dragon carry more, and long, patient work suits the year well.',
    action:
      'Break large goals into deliverable milestones so that “everything matters” does not stall you. In a steady year, do not bet on a single big opportunity; deepen what you already have. At work, stop absorbing responsibilities that are not yours — covering for colleagues once is kindness, doing it repeatedly is depletion.',
  },
  she: {
    focus:
      'For the Snake, 2027 has no clash, harm, punishment or combination with the annual branch: a steady year. Si is fire, and Ding-Wei fire-earth adds more heat, so inner drive and quick judgement are strong, but impatience and overconfidence come with them. A fire-heavy year punishes fast thinking paired with rough execution.',
    action:
      'Slow the rhythm by half a beat: sleep on important decisions, reread important documents the next day. This is a good year for work that needs insight and taste — research, planning, content, product refinement. Money is stable; avoid chasing hot trends. Watch heart-fire and sleep; fewer late nights beat any supplement.',
  },
  ma: {
    focus:
      'For the Horse, 2027 is a Wu–Wei six-combination, the most direct of the harmony group. Six-combination favours smooth relations and easy completion, and the Horse already acts quickly, so this is a year when people respond to you. Ding fire and Wu fire share the same qi: visibility and heat are high, and standing in front suits the year.',
    action:
      'Convert visibility into resources — public speaking, leading a team, building a personal brand all take less effort than usual. But too much fire invites impulse: read contracts carefully, especially clauses on revenue sharing and exit. In relationships the combination favours marriage; single people do better meeting people in person than through apps.',
  },
  yang: {
    focus:
      'For the Goat, 2027 is the benming year: Wei meets Wei, the traditional value year. The old saying warns of Tai Sui sitting overhead, but its substance is a return to your own place. External support may not be scarce; inner pressure is simply louder, and concern about how others see you grows. Ding fire feeds Wei earth, so the earth is heavy and the pressure feels tangible.',
    action:
      'The core of a benming year is stability: do not stake all your savings on an irreversible decision, and do not switch tracks on impulse. It is a year for subtraction — a check-up, tidying finances, repairing relationships, finishing old projects. Wearing red or visiting a temple can steady the mind; what actually works is slowing the pace by one notch.',
  },
  hou: {
    focus:
      'For the Monkey, 2027 has no clash, harm, punishment or combination with the annual branch: a steady year. Shen is metal; Ding-Wei fire and earth are strong, so fire controls metal while earth produces metal. The Monkey grows under pressure — outside constraints are many, and real skill is what they build. Opportunities hide in process, technique and detail rather than on the surface.',
    action:
      'Chase fewer trends and sharpen the craft. A good year for certifications, building tools, improving processes and turning a side project into a closed loop. Beware of cleverness turning against you: say seven-tenths of what you think and deliver ten-tenths of what you promise. Keep money steady, avoid comparing returns with others, and protect cash flow above all.',
  },
  ji: {
    focus:
      'For the Rooster, 2027 has no clash, harm, punishment or combination with the annual branch: a steady year. You metal meets Ding fire — fire tempering metal. The year brings more tests than rewards, but every test passed leaves reusable experience. The Rooster’s respect for rules and detail is exactly what such a year rewards.',
    action:
      'Set standards and hold them: decline work you should decline, and collect fees according to the contract. In a steady year the real risk is giving away margin to keep relationships smooth. A good year to review accounts, adjust pricing and sort out the client mix. Watch the respiratory system and skin; in a dry year, do not ignore small allergies.',
  },
  gou: {
    focus:
      'For the Dog, 2027 is a Xu–Wei punishment, a punishment year. Punishment governs disputes, repetition and friction: the same matter needs two or three rounds before it lands, the same person misreads you no matter how often you explain. Ding fire feeds Xu earth, and Xu is a fire storehouse, so emotion tends to accumulate and then erupt.',
    action:
      'Slow is safer than fast this year: delay major decisions by a week, outline important conversations before having them. Stay out of factions and gossip; say less in group chats and leave more in email. In relationships, do not reopen old accounts — solve the problem before discussing feelings. Watch digestion and skin, and give pent-up emotion an outlet.',
  },
  zhu: {
    focus:
      'For the Pig, 2027 forms a Hai–Mao–Wei three-combination with the annual branch, one of the harmony group. Hai water meets Ding fire — water reflecting a lamp. Inspiration and expression are lively, suiting work that needs an audience: content, teaching, consulting. The combination also brings more social obligations, and a fragmented schedule is the usual complaint.',
    action:
      'Turn social time into work: note the key points right after a meeting and write up the agreement immediately, or the resources the combination brings will scatter. Earned income is stable and partnership money is strong; avoid lending on behalf of friends. Protect sleep, especially in a season of frequent dinners.',
  },
}
