import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BRAND } from '@/ui/brand.ts';

export const metadata: Metadata = { title: 'Privacy' };

const CONTACT = 'connect.lwspune@gmail.com';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2 space-y-2 text-base leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

/**
 * The privacy policy (D42): public, because Google links to it from its
 * sign-in screen. Says only what the product does today (ARCHITECTURE.md's
 * honest-claims policy): no retention period is promised until the clean-up
 * job exists.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 md:py-14">
      <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Sign in</Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Privacy</h1>
      <p className="mt-2 text-sm text-muted-foreground">{BRAND.name} · updated 22 October 2026</p>

      <Section title="What we keep">
        <p>Your name and email: from Google when you sign in with Google, or from your academy when it makes your login. An academy may also add your date of birth and mobile number.</p>
        <p>What you do here: your answers, the photos of your answer sheets, your recorded narrations, and the marks and notes a mentor gives them.</p>
      </Section>

      <Section title="Who sees it">
        <p>You. If you belong to an academy, its owner and mentors. The {BRAND.name} team, to run the service and to review attempts sent for review.</p>
        <p>We do not sell it, show ads, or share it with anyone else.</p>
      </Section>

      <Section title="Where it is kept">
        <p>In a database and file store in Mumbai (Supabase). The site runs on Vercel. Google handles Google sign-in.</p>
      </Section>

      <Section title="Cookies">
        <p>One sign-in cookie, and your theme and question flags in your browser. No tracking or advertising cookies.</p>
      </Section>

      <Section title="Deleting it">
        <p>
          Write to <a href={`mailto:${CONTACT}`} className="font-semibold text-brand-accent hover:underline">{CONTACT}</a> from the email you sign in with, and we
          delete your account and everything in it.
        </p>
      </Section>
    </main>
  );
}
