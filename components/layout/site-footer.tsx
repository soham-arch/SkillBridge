const footerLinks = ['About', 'Terms', 'Privacy', 'Support'];

export function SiteFooter() {
  return (
    <footer className="flex w-full items-center justify-between bg-[#f3f3fe] px-6 py-6">
      <div className="flex flex-col items-start">
        <h2 className="pb-2 text-2xl font-bold text-[#004ac6]">SkillBridge</h2>
        <p className="text-xs font-medium tracking-[0.12px] text-gray-600">
          © 2024 SkillBridge. Built for students, by students.
        </p>
      </div>
      <nav aria-label="Footer navigation">
        <ul className="flex items-center gap-6">
          {footerLinks.map((link) => (
            <li key={link}>
              <span className="cursor-pointer text-xs font-medium tracking-[0.12px] text-gray-600 transition-colors hover:text-[#004ac6]">
                {link}
              </span>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
