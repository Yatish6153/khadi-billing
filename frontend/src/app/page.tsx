import { redirect } from 'next/navigation';

/** "/" has no content of its own; the middleware already sends guests to /login. */
export default function Home() {
  redirect('/dashboard');
}
