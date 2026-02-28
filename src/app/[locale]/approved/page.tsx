// This page is shown to the parent after they click the approval link.
// It lives under [locale] so it inherits the ClerkProvider layout,
// but it doesn't require the child to be signed in.

export default function ApprovedPage({
  searchParams,
}: {
  searchParams: { name?: string; status?: string };
}) {
  const name   = searchParams.name   ? decodeURIComponent(searchParams.name) : null;
  const status = searchParams.status;

  const alreadyDone = status === 'already' || status === 'invalid';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="card-kids border-kids-green w-full max-w-md space-y-6">
        <div className="text-8xl">{alreadyDone ? '✅' : '🎉'}</div>

        {alreadyDone ? (
          <>
            <h1 className="text-3xl font-black text-kids-purple">Already approved!</h1>
            <p className="text-lg font-bold text-gray-500">
              This account is already active. Your child can start coding right away.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-black text-kids-purple">
              {name ? `${name} is ready to code!` : 'Account approved!'}
            </h1>
            <p className="text-lg font-bold text-gray-500">
              You just unlocked their coding adventure. 🚀
            </p>
            <p className="text-sm font-bold text-gray-400">
              Tell them to open the app and click a lesson — they're all set!
            </p>
          </>
        )}
      </div>
    </main>
  );
}
