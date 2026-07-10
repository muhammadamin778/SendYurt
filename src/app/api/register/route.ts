import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { generateInviteCode } from "@/lib/invite-code";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await hash(data.password, 12);

  try {
    if (data.householdMode === "join") {
      const household = await prisma.household.findUnique({
        where: { inviteCode: data.inviteCode! },
      });
      if (!household) {
        return NextResponse.json({ error: "invalid_invite_code" }, { status: 400 });
      }
      await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: data.role,
          householdId: household.id,
        },
      });
    } else {
      // Create household + first member atomically. Retry once if the
      // generated invite code collides (unique constraint).
      const create = () =>
        prisma.household.create({
          data: {
            name: data.householdName!,
            inviteCode: generateInviteCode(),
            users: {
              create: {
                name: data.name,
                email: data.email,
                passwordHash,
                role: data.role,
              },
            },
          },
        });
      try {
        await create();
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          await create();
        } else {
          throw e;
        }
      }
    }
  } catch (e) {
    // Unique email race between the check above and the insert.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    console.error("register failed", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
