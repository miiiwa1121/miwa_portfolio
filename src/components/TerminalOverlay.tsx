"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTerminal } from "./TerminalContext";

type HistoryItem = {
  type: "command" | "output";
  content: ReactNode;
  dir?: string;
};

const ASCII_LOGO = `
 __  __ _ _ _               
|  \\/  (_|_|_)_      ____ _ 
| |\\/| | | | \\ \\ /\\ / / _\` |
| |  | | | | |\\ V  V / (_| |
|_|  |_|_|_|_| \\_/\\_/ \\__,_|
`;

const ASCII_ABOUT = `
      .---.      [ Miiiwa / 27卒 学生エンジニア ]
     /_____\\     MOTTO: 面白いを最優先！
     ( '.' )     BIO: 新規性重視で、まだこの世にないものを探し求めています！
      \\_-_/      単に動くだけでなく、使ってて楽しいUX/UIを提供します。
    .-"\`'"\`-.
   /         \\
`;

const ASCII_SKILLS = `
      .-----------.
     /__________ /|  [FRONTEND] React, Next.js, Tailwind, TS/JS, HTML/CSS
    |           | |  [BACKEND]  Node.js, Python, PHP, Laravel, Java, C, C#
    |  SKILLS   | |  [MOBILE]   Flutter, Dart
    |           | /  [INFRA/DB] AWS, GCP, Vercel, Cloudflare, Supabase, MySQL...
    \`-----------´/   [TOOLS]    Git, GitHub, Cypress, Figma
      [=======]
`;

const ASCII_EXPERIENCE = `
 [2023] プログラミング学習開始
   |    フロントエンド技術（HTML/CSS/JS）の基礎を習得。
   v
 [2024] 実践とチーム開発
   |    React/Next.jsを用いた本格的なSPA開発に着手。ハッカソン等に参加。
   v
 [2025] キャリアスタート準備
        ポートフォリオ制作と就職活動準備。27卒エンジニアとして活動中。
`;

const ASCII_README = `
=============================================
 Miiiwa OS - Terminal Mode User Manual
=============================================

Welcome to the interactive terminal mode!
This is an easter egg built into the portfolio.

[AVAILABLE COMMANDS]
  ls       : List directory contents
  cd <dir> : Change working directory
             Use 'cd ..' or 'cd ~' to return home
  pwd      : Print working directory
  cat <f>  : Read the content of a file
             Example: cat about.txt
  date     : Show current system time
  whoami   : Show current user
  clear    : Clear the terminal screen
  exit     : Close the terminal and return to UI

[SHORTCUTS]
  about, skills, experience, products

Have fun exploring the system!
`;

const FILE_SYSTEM = {
  "~": ["README.md", "about.txt", "skills.log", "experience.md", "products/"],
  "~/products": ["product1.exe", "product2.exe", "product3.exe"]
};

export default function TerminalOverlay() {
  const { isOpen, closeTerminal } = useTerminal();
  const [phase, setPhase] = useState<"hidden" | "downloading" | "terminal">("hidden");
  const [downloadLines, setDownloadLines] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [input, setInput] = useState("");
  const [currentDir, setCurrentDir] = useState("~");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [downloadLines, history, phase]);

  useEffect(() => {
    if (isOpen) {
      setPhase("downloading");
      setDownloadLines([]);
      setHistory([]);
      setCurrentDir("~");
      
      const sequence = [
        "Establishing secure connection to miiiwa.dev...",
        "Connection established. Handshake OK.",
        "Downloading payload... [0%]",
        "Downloading payload... [34%]",
        "Downloading payload... [78%]",
        "Downloading payload... [100%]",
        "Decrypting core assets...",
        "Assets decrypted successfully.",
        "Booting interactive shell...",
        "System Ready."
      ];

      let delay = 0;
      const timeouts: NodeJS.Timeout[] = [];
      
      sequence.forEach((line, index) => {
        const timeout = setTimeout(() => {
          setDownloadLines(prev => [...prev, line]);
          if (index === sequence.length - 1) {
            setTimeout(() => {
              setPhase("terminal");
              setHistory([
                { type: "output", content: <pre className="text-green-400 font-bold">{ASCII_LOGO}</pre> },
                { type: "output", content: "Welcome to Miiiwa OS v1.0.0" },
                { type: "output", content: "Type 'help' to see available commands." }
              ]);
            }, 800);
          }
        }, delay);
        timeouts.push(timeout);
        delay += Math.random() * 300 + 100;
      });

      return () => timeouts.forEach(clearTimeout);
    } else {
      setPhase("hidden");
    }
  }, [isOpen]);

  useEffect(() => {
    if (phase === "terminal" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) {
      setHistory(prev => [...prev, { type: "command", content: "", dir: currentDir }]);
      return;
    }

    setHistory(prev => [...prev, { type: "command", content: trimmed, dir: currentDir }]);
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    
    const args = trimmed.split(" ").filter(Boolean);
    const command = args[0].toLowerCase();
    
    let output: ReactNode = "";
    
    switch(command) {
      case "help":
        output = (
          <div className="space-y-1">
            <div><span className="text-white font-bold">UNIX COMMANDS:</span></div>
            <div>  ls       - List directory contents</div>
            <div>  cd       - Change directory</div>
            <div>  pwd      - Print working directory</div>
            <div>  cat      - Print file content</div>
            <div>  clear    - Clear terminal output</div>
            <div>  date     - Print current date and time</div>
            <div>  whoami   - Print current user</div>
            <br/>
            <div><span className="text-white font-bold">SHORTCUTS:</span></div>
            <div>  about, skills, experience, products, exit</div>
          </div>
        );
        break;
      case "pwd":
        output = currentDir === "~" ? "/home/miiiwa" : `/home/miiiwa/${currentDir.replace("~/", "")}`;
        break;
      case "whoami":
        output = "miiiwa (Guest User)";
        break;
      case "date":
        output = new Date().toString();
        break;
      case "ls":
        const files = FILE_SYSTEM[currentDir as keyof typeof FILE_SYSTEM] || [];
        output = (
          <div className="flex gap-4">
            {files.map(f => (
              <span key={f} className={f.endsWith("/") ? "text-blue-400 font-bold" : "text-green-300"}>{f}</span>
            ))}
          </div>
        );
        break;
      case "cd":
        const target = args[1];
        if (!target || target === "~" || target === "/") {
          setCurrentDir("~");
        } else if (target === "..") {
          setCurrentDir("~");
        } else if (currentDir === "~" && target.replace("/", "") === "products") {
          setCurrentDir("~/products");
        } else {
          output = `cd: ${target}: No such file or directory`;
        }
        break;
      case "cat":
        const file = args[1];
        if (!file) {
          output = "cat: missing file operand";
        } else if (currentDir === "~" && file === "README.md") {
          output = <pre className="text-green-300 leading-tight whitespace-pre-wrap font-mono">{ASCII_README}</pre>;
        } else if (currentDir === "~" && file === "about.txt") {
          output = <pre className="text-green-300 leading-tight whitespace-pre-wrap font-mono">{ASCII_ABOUT}</pre>;
        } else if (currentDir === "~" && file === "skills.log") {
          output = <pre className="text-green-300 leading-tight whitespace-pre-wrap font-mono">{ASCII_SKILLS}</pre>;
        } else if (currentDir === "~" && file === "experience.md") {
          output = <pre className="text-green-300 leading-tight whitespace-pre-wrap font-mono">{ASCII_EXPERIENCE}</pre>;
        } else if (currentDir === "~/products" && file.startsWith("product")) {
          output = <pre className="text-red-400 leading-tight font-mono">EXECUTING {file}... ERROR: Permission denied. Classified project.</pre>;
        } else {
          output = `cat: ${file}: No such file or directory`;
        }
        break;
      
      // Shortcuts
      case "about":
        output = <pre className="text-green-300 leading-tight whitespace-pre-wrap font-mono">{ASCII_ABOUT}</pre>;
        break;
      case "skills":
        output = <pre className="text-green-300 leading-tight whitespace-pre-wrap font-mono">{ASCII_SKILLS}</pre>;
        break;
      case "experience":
        output = <pre className="text-green-300 leading-tight whitespace-pre-wrap font-mono">{ASCII_EXPERIENCE}</pre>;
        break;
      case "products":
        if (currentDir === "~") {
          setCurrentDir("~/products");
          output = "Changed directory to ~/products. Type 'ls' to view contents.";
        } else {
          output = "You are already in the products directory.";
        }
        break;
      case "clear":
        setHistory([]);
        setInput("");
        return;
      case "exit":
        closeTerminal();
        setInput("");
        return;
      default:
        output = `Command not found: ${command}. Type 'help' for a list of commands.`;
    }
    
    setHistory(prev => [...prev, { type: "output", content: output }]);
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-[#050505] text-green-500 font-mono p-4 sm:p-8 flex flex-col overflow-y-auto"
          onClick={() => phase === "terminal" && inputRef.current?.focus()}
        >
          {/* CRT Overlay */}
          <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.15] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

          {phase === "downloading" && (
            <div className="space-y-1 relative z-10">
              {downloadLines.map((line, i) => (
                <div key={i} className="animate-pulse">{line}</div>
              ))}
            </div>
          )}

          {phase === "terminal" && (
            <div className="flex-1 flex flex-col relative z-10 pb-8">
              <div className="space-y-1 mb-2">
                {history.map((item, i) => (
                  <div key={i} className={item.type === "command" ? "text-white mt-4" : "text-green-500"}>
                    {item.type === "command" && <span className="mr-2 text-green-500 font-bold">miiiwa@macbook:{item.dir}$</span>}
                    {item.content}
                  </div>
                ))}
              </div>
              <div className="flex items-center mt-4">
                <span className="mr-2 text-green-500 font-bold">miiiwa@macbook:{currentDir}$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCommand(input);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      if (commandHistory.length > 0) {
                        const newIndex = historyIndex + 1;
                        if (newIndex < commandHistory.length) {
                          setHistoryIndex(newIndex);
                          setInput(commandHistory[commandHistory.length - 1 - newIndex]);
                        }
                      }
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      if (historyIndex > 0) {
                        const newIndex = historyIndex - 1;
                        setHistoryIndex(newIndex);
                        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
                      } else if (historyIndex === 0) {
                        setHistoryIndex(-1);
                        setInput("");
                      }
                    }
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-white font-mono"
                  autoFocus
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
            </div>
          )}
          
          <div ref={bottomRef} className="h-8" />
          
          <button 
            onClick={closeTerminal}
            className="fixed top-4 right-4 z-50 text-green-500 hover:text-white transition-colors text-sm border border-green-500/30 px-3 py-1 rounded bg-black/50"
          >
            EXIT TERMINAL
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
