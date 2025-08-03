import { useState, useRef } from 'react';
import { HeroSection } from '@/components/HeroSection';
import { PitchForm } from '@/components/PitchForm';
import { PitchResults } from '@/components/PitchResults';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FlowiseService } from '@/services/flowiseApi';
import { useToast } from '@/hooks/use-toast';

type AppState = 'hero' | 'form' | 'results' | 'loading';

interface PitchFormData {
  startup_idea: string;
  industry: string;
  target_audience: string;
  uploaded_file?: File;
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>('hero');
  const [pitchData, setPitchData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLElement>(null);
  const { toast } = useToast();

  const scrollToForm = () => {
    setAppState('form');
    setTimeout(() => {
      const formElement = document.getElementById('pitch-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleFormSubmit = async (formData: PitchFormData) => {
    setIsLoading(true);
    setAppState('loading');

    try {
      toast({
        title: "Generating your pitch deck...",
        description: "Our AI is analyzing your startup idea and creating a comprehensive pitch deck.",
      });

      const result = await FlowiseService.generatePitchDeck(formData);
      setPitchData(result);
      setAppState('results');

      toast({
        title: "Pitch deck generated!",
        description: "Your investor-ready pitch deck is now ready for review.",
      });
    } catch (error) {
      console.error('Error generating pitch deck:', error);
      
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate pitch deck. Please try again.",
        variant: "destructive"
      });
      
      setAppState('form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    setAppState('form');
    setPitchData('');
    setTimeout(() => {
      const formElement = document.getElementById('pitch-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleRegenerate = () => {
    setAppState('form');
    toast({
      title: "Ready to regenerate",
      description: "Modify your inputs below and submit again to create a new pitch deck.",
    });
    setTimeout(() => {
      const formElement = document.getElementById('pitch-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  if (appState === 'results' && pitchData) {
    return (
      <>
        <ThemeToggle />
        <PitchResults 
          pitchData={pitchData}
          onGoBack={handleGoBack}
          onRegenerate={handleRegenerate}
        />
      </>
    );
  }

  if (appState === 'loading') {
    return (
      <>
        <ThemeToggle />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold mb-4 gradient-text">Crafting Your Pitch Deck</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our AI is analyzing your startup idea and generating a comprehensive, 
              investor-ready pitch deck. This usually takes 30-60 seconds.
            </p>
            <div className="mt-8 flex justify-center">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <ThemeToggle />
      
      {/* Hero Section */}
      {appState === 'hero' && (
        <HeroSection onScrollToForm={scrollToForm} />
      )}
      
      {/* Form Section */}
      {(appState === 'form' || appState === 'hero') && (
        <PitchForm 
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default Index;
