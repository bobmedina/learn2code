import { redirect } from 'next/navigation';

// Root page — middleware handles locale redirect, but this is a fallback
export default function RootPage() {
  redirect('/en');
}
