import { redirect } from 'next/navigation';

// Raíz: el panel solo existe bajo /admin. Cualquier hit a `/` redirige a login.
export default function RootPage() {
  redirect('/admin/login');
}
