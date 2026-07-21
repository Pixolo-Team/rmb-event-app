"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { DirectoryAvatar } from "../components/DirectoryAvatar";
import { EventSummary, summaryCache } from "../lib/summaryCache";

const PREVIEW: EventSummary = { attendeeName: "Radha Sharma", event: { name: "RMB Business Conclave 2026", startAt: "2026-07-16T04:30:00.000Z", endAt: "2026-07-16T13:30:00.000Z" }, peopleMet: 12, cardsCollected: 12, rank: 8, totalRanked: 148, generatedAt: new Date().toISOString(), topConnections: [
  { id:"s1",name:"Aarav Mehta",phone:"+919810012345",email:"aarav@example.com",businessName:"Mehta Packaging Solutions",tableNumber:"12",metAt:"2026-07-16T09:42:00.000Z",note:"Follow up next week" },
  { id:"s2",name:"Neha Kapoor",phone:"+919820067890",email:"neha@example.com",businessName:"Kapoor Digital",tableNumber:"7",metAt:"2026-07-16T08:25:00.000Z",note:"" },
] };

export default function SummaryPage() {
  const [data,setData]=useState<EventSummary|null>(null); const [loading,setLoading]=useState(true); const [offline,setOffline]=useState(false); const [error,setError]=useState(false);
  useEffect(()=>{ window.scrollTo(0,0); const isPreview=process.env.NODE_ENV!=="production"&&new URLSearchParams(location.search).get("preview")==="1"; if(isPreview){setData(PREVIEW);setLoading(false);return;} const cached=summaryCache.get(); if(cached){setData(cached);setOffline(!navigator.onLine);setLoading(false);} fetch("/api/attendees/me/summary",{credentials:"include"}).then(async response=>{if(!response.ok)throw new Error();const result=await response.json() as EventSummary;summaryCache.set(result);setData(result);setOffline(false);setError(false);}).catch(()=>{if(!cached)setError(true);}).finally(()=>setLoading(false)); },[]);
  return <AttendeePageShell><main className="attendee-page summary-page">
    {offline&&<div className="banner info"><div><b>Showing saved summary</b>You’re offline. Export requires a connection.</div></div>}
    {loading&&<div className="directory-loading">Preparing your summary…</div>}
    {!loading&&error&&!data&&<div className="directory-state"><h1>Can’t load your summary</h1><p>Check your connection and try again.</p></div>}
    {data&&<><section className="summary-hero"><p className="eyebrow">Your event recap</p><h1>{data.event.name}</h1><p>{data.event.startAt?new Intl.DateTimeFormat(undefined,{dateStyle:"long"}).format(new Date(data.event.startAt)):"Networking summary"}</p><div className="summary-celebration" aria-hidden="true">✓</div></section>
    <section className="summary-stats" aria-label="Event statistics"><div><strong>{data.peopleMet}</strong><span>People met</span></div><div><strong>{data.cardsCollected}</strong><span>Cards collected</span></div><div><strong>#{data.rank}</strong><span>of {data.totalRanked} attendees</span></div></section>
    <section className="summary-section"><div className="summary-section-heading"><div><p className="eyebrow">Follow up</p><h2>Top connections</h2></div><Link href="/connections">View all</Link></div>{data.topConnections.length?<div className="summary-connections">{data.topConnections.map(person=><Link href={`/attendees/${person.id}`} className="summary-person" key={person.id}><DirectoryAvatar name={person.name} photoUrl={null}/><div><b>{person.name}</b><span>{person.businessName??"Evento attendee"}</span>{person.tableNumber&&<small>Table {person.tableNumber}</small>}</div><span aria-hidden="true">›</span></Link>)}</div>:<div className="summary-empty"><p>You didn’t record any meetings yet.</p><Link href="/directory">Browse attendees</Link></div>}</section></>}
  </main></AttendeePageShell>;
}
