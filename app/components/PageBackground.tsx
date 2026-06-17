"use client";

export default function PageBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      className="
min-h-screen
bg-gradient-to-br
from-[#0b1220]
via-[#111827]
to-[#1a120b]
text-white
relative
overflow-hidden
"
    >
      {/* Orange ambient glow */}
      <div className="absolute -top-40 -left-40 w-[450px] h-[450px] bg-orange-500/20 rounded-full blur-[120px]" />

      {/* Bottom glow */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-400/15 rounded-full blur-[150px]" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </main>
  );
}