import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, Send, FileText, Users, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

gsap.registerPlugin(ScrollTrigger);

interface StartupEvaluationData {
  startup_idea: string;
  industry: string;
  target_audience: string;
  uploaded_file?: File;
}

interface PitchFormProps {
  onSubmit: (data: StartupEvaluationData) => void;
  isLoading: boolean;
}

export const PitchForm = ({ onSubmit, isLoading }: PitchFormProps) => {
  const [formData, setFormData] = useState<StartupEvaluationData>({
    startup_idea: '',
    industry: '',
    target_audience: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    gsap.fromTo(form, 
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: form,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      }
    );
  }, []);

  const handleInputChange = (field: keyof StartupEvaluationData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    if (!['application/pdf', 'text/plain'].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or text file.",
        variant: "destructive"
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      uploaded_file: file
    }));

    toast({
      title: "File uploaded",
      description: `${file.name} has been attached to your submission.`,
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.startup_idea.trim()) {
      toast({
        title: "Missing information",
        description: "Please describe your startup idea.",
        variant: "destructive"
      });
      return;
    }

    onSubmit(formData);
  };

  return (
    <section id="pitch-form" className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Evaluate Your <span className="gradient-text">Startup Idea</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get comprehensive AI-powered analysis including market insights, tech recommendations, and competitive evaluation.
          </p>
        </div>

        <Card className="glass-card border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Startup Idea Evaluation
            </CardTitle>
            <CardDescription>
              Submit your startup idea for comprehensive AI analysis and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              {/* Startup Idea */}
              <div className="space-y-2">
                <Label htmlFor="startup_idea" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Startup Idea *
                </Label>
                <Textarea
                  id="startup_idea"
                  placeholder="Describe your startup idea in detail. What problem does it solve? What's your solution? Include any key features, target market insights, or unique value propositions..."
                  value={formData.startup_idea}
                  onChange={(e) => handleInputChange('startup_idea', e.target.value)}
                  className="min-h-32 glass-card border-border/50 focus:border-primary/50"
                  disabled={isLoading}
                />
              </div>

              {/* Industry and Target Audience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="industry" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Industry/Domain
                  </Label>
                  <Input
                    id="industry"
                    placeholder="e.g., FinTech, HealthTech, E-commerce..."
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="glass-card border-border/50 focus:border-primary/50"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_audience" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Target Audience
                  </Label>
                  <Input
                    id="target_audience"
                    placeholder="e.g., Small businesses, Millennials, Healthcare providers..."
                    value={formData.target_audience}
                    onChange={(e) => handleInputChange('target_audience', e.target.value)}
                    className="glass-card border-border/50 focus:border-primary/50"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Supporting Documents (Optional)
                </Label>
                <div
                  className={`
                    glass-card border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
                    ${dragActive ? 'border-primary/50 bg-primary/5' : 'border-border/50 hover:border-primary/30'}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => !isLoading && document.getElementById('file-upload')?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    disabled={isLoading}
                  />
                  
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  
                  {formData.uploaded_file ? (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        📄 {formData.uploaded_file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        File uploaded successfully
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Drop your files here or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF or TXT files up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                disabled={isLoading || !formData.startup_idea.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Generating Your Pitch Deck...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Generate Pitch Deck
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};