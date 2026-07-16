import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}
  submit(attendeeId: string, rating: number, comment?: string) { return this.prisma.feedback.create({ data: { attendeeId, rating, comment: comment?.trim() || null }, select: { id: true, rating: true, comment: true, createdAt: true } }); }
  async analytics(search = "", rating?: number) {
    const where = { ...(rating ? { rating } : {}), ...(search ? { OR: [{ comment: { contains: search, mode: "insensitive" as const } }, { attendee: { name: { contains: search, mode: "insensitive" as const } } }] } : {}) };
    const [all, rows] = await Promise.all([
      this.prisma.feedback.findMany({ select: { rating: true } }),
      this.prisma.feedback.findMany({ where, orderBy: { createdAt: "desc" }, include: { attendee: { select: { name: true, businessName: true } } }, take: 500 }),
    ]);
    const distribution = [1,2,3,4,5].map(value => ({ rating: value, count: all.filter(item => item.rating === value).length }));
    return { total: all.length, average: all.length ? all.reduce((sum,item)=>sum+item.rating,0)/all.length : 0, distribution, feedback: rows.map(row=>({ id:row.id,rating:row.rating,comment:row.comment,createdAt:row.createdAt,attendeeName:row.attendee.name,businessName:row.attendee.businessName })) };
  }
  async csv() { const data=await this.prisma.feedback.findMany({orderBy:{createdAt:"desc"},include:{attendee:{select:{name:true,email:true,businessName:true}}}}); const q=(v:unknown)=>`"${String(v??"").replace(/"/g,'""')}"`; return ["Attendee,Email,Company,Rating,Comment,Submitted At",...data.map(row=>[row.attendee.name,row.attendee.email,row.attendee.businessName,row.rating,row.comment,row.createdAt.toISOString()].map(q).join(","))].join("\r\n"); }
}
