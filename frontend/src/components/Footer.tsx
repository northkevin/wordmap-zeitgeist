import React from "react";
import { motion } from "framer-motion";
import { Github, ExternalLink } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm mt-16"
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {/* Left side - GitHub link */}
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/northkevin/wordmap-zeitgeist"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
            >
              <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm">View on GitHub</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>

          {/* Center - Copyright */}
          <div className="text-center text-gray-500 text-xs">
            © 2025 Wordmap Zeitgeist. Real-time internet pulse analysis.
          </div>

          {/* Right side - Powered by Render */}
          <div className="flex items-center space-x-2 text-gray-500 text-xs">
            <span>Powered by</span>
            <a
              href="https://render.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-gray-300 transition-colors group"
            >
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 16.568A7.953 7.953 0 0112 20a7.953 7.953 0 01-5.568-2.432A7.953 7.953 0 014 12a7.953 7.953 0 012.432-5.568A7.953 7.953 0 0112 4a7.953 7.953 0 015.568 2.432A7.953 7.953 0 0120 12a7.953 7.953 0 01-2.432 5.568z"/>
                <path d="M12 6a6 6 0 100 12 6 6 0 000-12zm0 10a4 4 0 110-8 4 4 0 010 8z"/>
              </svg>
              <span className="font-medium">Render</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;