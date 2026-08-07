const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('const RedditIcon')) {
  code = code.replace('const translations', `const RedditIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
  >
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const translations`);
}

code = code.replace(/instagram:\s*"([^"]*)",/g, function(match, p1) {
  let redditStr = "Reddit";
  if (p1 === "انستقرام") redditStr = "ريديت";
  else if (p1 === "انسٹاگرام") redditStr = "ریڈٹ";
  else if (p1 === "اینستاگرام") redditStr = "ردیت";
  else if (p1 === "इंस्टाग्राम") redditStr = "रेडिट";
  else if (p1 === "인스타그램") redditStr = "레딧";
  
  return match + ' reddit: "' + redditStr + '",';
});

const emailLinkBlock = `                            <a 
                              href="mailto:contact@pezeex.com"
                              className={\`flex items-center gap-4 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all group \${t.dir === "rtl" ? "flex-row-reverse" : "flex-row"}\`}
                            >
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Mail size={24} />
                              </div>
                              <div className={\`flex flex-col \${t.dir === "rtl" ? "items-end" : "items-start"}\`}>
                                <span className="text-sm text-muted-foreground">{t.email}</span>
                                <span className="text-base font-bold text-primary">contact@pezeex.com</span>
                              </div>
                            </a>`;

const redditLinkBlock = emailLinkBlock + `
                            <a 
                              href="https://www.reddit.com/u/ExternalAd2358/?utm_source=share&utm_medium=ios_app&utm_name=ioscss&utm_content=1&utm_term=1" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={\`flex items-center gap-4 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all group \${t.dir === "rtl" ? "flex-row-reverse" : "flex-row"}\`}
                            >
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <RedditIcon size={24} />
                              </div>
                              <div className={\`flex flex-col \${t.dir === "rtl" ? "items-end" : "items-start"}\`}>
                                <span className="text-sm text-muted-foreground">{t.reddit}</span>
                                <span className="text-base font-bold text-primary">u/ExternalAd2358</span>
                              </div>
                            </a>`;

code = code.replace(emailLinkBlock, redditLinkBlock);

fs.writeFileSync('src/App.tsx', code);
