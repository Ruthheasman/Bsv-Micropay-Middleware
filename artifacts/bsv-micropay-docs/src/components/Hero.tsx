import { motion } from "framer-motion";
import { ArrowRight, Terminal } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[100px]" />
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-abstract.png`} 
          alt="Abstract geometric shapes" 
          className="absolute right-0 top-20 w-1/2 h-auto object-cover opacity-10 md:opacity-30 mix-blend-multiply dark:mix-blend-screen"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="max-w-3xl lg:flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6 border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                v0.2.0 · Now with BRC-121 Support
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl font-display font-bold text-foreground leading-[1.1] mb-6"
            >
              Monetize APIs in <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                One Line of Code.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl"
            >
              Express middleware and a powerful client SDK for autonomous pay-per-use endpoints using Bitcoin SV.
              Ship a quick address-based flow in one line, or switch to the fully BRC-121 standards-compliant mode for ecosystem interop. Zero OAuth. Zero redirects.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <a
                href="#demo"
                className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2"
              >
                Try the Live Demo <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#middleware"
                className="px-8 py-4 rounded-xl font-semibold bg-card text-foreground border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 flex items-center gap-2"
              >
                <Terminal className="w-5 h-5 text-muted-foreground" /> Read the Docs
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:flex-shrink-0"
          >
            <img
              src={`${import.meta.env.BASE_URL}images/hero-graphic.jpg`}
              alt="Machine Value API — Autonomous Transfer, Zero Redirects"
              className="w-72 sm:w-80 md:w-96 lg:w-[420px] h-auto rounded-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
