import { useState, useRef } from 'react';
import { HeroSection } from '@/components/HeroSection';
import { PitchForm } from '@/components/PitchForm';
import { PitchResults } from '@/components/PitchResults';
import { ThemeToggle } from '@/components/ThemeToggle';
import { StartwiseAIService } from '@/services/startwiseApi';
import { FlowiseService } from '@/services/flowiseApi';
import { useToast } from '@/hooks/use-toast';

type AppState = 'hero' | 'form' | 'results' | 'loading';

interface StartupEvaluationData {
  startup_idea: string;
  industry: string;
  target_audience: string;
  uploaded_file?: File;
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>('hero');
  const [evaluationData, setEvaluationData] = useState<string>('');
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

  const handleFormSubmit = async (formData: StartupEvaluationData) => {
    setIsLoading(true);
    setAppState('loading');

    try {
      toast({
        title: "Evaluating your startup idea...",
        description: "StartwiseAI is analyzing your idea with comprehensive market research and recommendations.",
      });

      console.log('Sending request to your Flowise API:', formData);
      const result = await FlowiseService.generatePitchDeck(formData);
      console.log('Received evaluation from your Flowise API:', result);
      
      setEvaluationData(result);
      setAppState('results');

      toast({
        title: "Evaluation complete!",
        description: "Your comprehensive startup evaluation is ready for review.",
      });
    } catch (error) {
      console.error('Error evaluating startup idea:', error);
      
      toast({
        title: "Evaluation failed",
        description: error instanceof Error ? error.message : "Failed to evaluate startup idea. Please try again.",
        variant: "destructive"
      });
      
      setAppState('form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    setAppState('form');
    setEvaluationData('');
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

  if (appState === 'results' && evaluationData) {
    return (
      <>
        <ThemeToggle />
        <PitchResults 
          pitchData={evaluationData}
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
            <h2 className="text-2xl font-bold mb-4 gradient-text">Analyzing Your Startup Idea</h2>
            <p className="text-muted-foreground leading-relaxed">
              StartwiseAI is conducting a comprehensive evaluation of your startup idea, 
              including market analysis, tech recommendations, and competitive insights. This usually takes 30-60 seconds.
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
