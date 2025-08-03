import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import { ArrowDown, Sparkles, Zap, Target } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  onScrollToForm: () => void;
}

export const HeroSection = ({ onScrollToForm }: HeroSectionProps) => {
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const cta = ctaRef.current;
    const features = featuresRef.current;

    if (!hero || !title || !subtitle || !cta || !features) return;

    // Reset initial states
    gsap.set([title, subtitle, cta, features], { 
      opacity: 0, 
      y: 50 
    });

    // Create timeline for entrance animations
    const tl = gsap.timeline({ delay: 0.2 });

    tl.to(title, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out"
    })
    .to(subtitle, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.5")
    .to(cta, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.3")
    .to(features, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.3");

    // Floating animation for features
    gsap.to(features.children, {
      y: -10,
      duration: 3,
      ease: "sine.inOut",
      stagger: 0.2,
      repeat: -1,
      yoyo: true
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section 
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 bg-hero-bg"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Main Title */}
        <h1 
          ref={titleRef}
          className="text-6xl md:text-8xl font-bold mb-6 leading-tight"
        >
          <span className="gradient-text">PitchCraft</span>{' '}
          <span className="text-foreground">AI</span>
        </h1>

        {/* Subtitle */}
        <p 
          ref={subtitleRef}
          className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          Transform your startup idea into an investor-ready pitch deck in minutes. 
          Our AI agent creates comprehensive, professional presentations that get results.
        </p>

        {/* CTA Button */}
        <div ref={ctaRef} className="mb-16">
          <Button 
            variant="hero" 
            size="xl"
            onClick={onScrollToForm}
            className="group"
          >
            Generate Your Pitch Deck
            <ArrowDown className="ml-2 h-5 w-5 group-hover:translate-y-1 transition-transform" />
          </Button>
        </div>

        {/* Feature Highlights */}
        <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="glass-card p-6 rounded-2xl">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 mx-auto">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Content</h3>
            <p className="text-muted-foreground text-sm">
              Advanced AI analyzes your idea and generates compelling, structured content for all 10 essential pitch deck sections.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center mb-4 mx-auto">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground text-sm">
              Get your complete pitch deck in under 5 minutes. No more weeks of struggling with content and design.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 mx-auto">
              <Target className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Investor-Ready</h3>
            <p className="text-muted-foreground text-sm">
              Professional format following proven frameworks that investors expect and understand.
            </p>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ArrowDown className="h-6 w-6 text-muted-foreground" />
      </div>
    </section>
  );
};