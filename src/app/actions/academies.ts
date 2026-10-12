'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { slugify } from '@/ui/admin/slug.ts';
import type { CreateAcademyState } from '@/ui/admin/CreateAcademyForm.tsx';

/** The database decides who may (create_academy, 0004); this only shapes the input and the message. */
export async function createAcademy(_state: CreateAcademyState, form: FormData): Promise<CreateAcademyState> {
  const name = String(form.get('name') ?? '').trim();
  if (name.length < 1 || name.length > 120) return { error: 'Give the academy a name.' };
  const slug = slugify(name);
  if (!slug) return { error: 'The name needs some letters or digits.' };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc('create_academy', { p_name: name, p_slug: slug });
  if (error) {
    if (/slug_taken/.test(error.message)) return { error: `"${slug}" is already taken. Add a city or a number to the name.` };
    if (/not_superadmin/.test(error.message)) return { error: 'Only a superadmin can create academies.' };
    console.error('create_academy failed', { code: error.code });
    return { error: 'Could not create the academy. Try again.' };
  }
  revalidatePath('/admin/academies');
  redirect(`/admin/academies/${data}`);
}
