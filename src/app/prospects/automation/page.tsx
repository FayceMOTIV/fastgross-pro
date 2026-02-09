"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import {
  Plus, Mail, Phone, Trash2, Edit, Play,
  Pause, Sparkles, GripVertical, ChevronRight,
  BarChart3, Send, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useUIStore } from "@/stores";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PhonePreviewButton } from "@/components/ui/phone-preview";

// Types
interface EmailStep {
  id: string;
  day: number;
  type: "email" | "task" | "sms";
  subject?: string;
  template: string;
}

interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  steps: EmailStep[];
  active: boolean;
  stats: {
    sent: number;
    opened: number;
    replied: number;
    converted: number;
  };
  createdAt: Date;
}

// Mock data
const mockSequences: EmailSequence[] = [
  {
    id: "seq1",
    name: "Séquence Nouveau Prospect",
    description: "Pour les prospects identifiés via scraping",
    steps: [
      { id: "s1", day: 0, type: "email", subject: "Découvrez DISTRAM", template: "Bonjour {{nom}},\n\nJe me permets de vous contacter car votre établissement {{entreprise}} pourrait bénéficier de nos services..." },
      { id: "s2", day: 3, type: "task", template: "Appeler {{nom}} pour suivi" },
      { id: "s3", day: 7, type: "email", subject: "Offre spéciale pour {{entreprise}}", template: "Bonjour {{nom}},\n\nSuite à mon précédent message, je souhaitais vous proposer une offre de bienvenue exclusive..." },
      { id: "s4", day: 14, type: "email", subject: "Dernière relance", template: "Bonjour {{nom}},\n\nJe comprends que vous êtes occupé. Si vous êtes intéressé, je reste disponible..." },
    ],
    active: true,
    stats: { sent: 156, opened: 89, replied: 23, converted: 8 },
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "seq2",
    name: "Réactivation Client Inactif",
    description: "Pour les clients sans commande depuis 30 jours",
    steps: [
      { id: "s5", day: 0, type: "email", subject: "Vous nous manquez {{nom}} !", template: "Bonjour {{nom}},\n\nCela fait un moment que nous n'avons pas eu de vos nouvelles..." },
      { id: "s6", day: 5, type: "sms", template: "{{nom}}, profitez de -10% sur votre prochaine commande avec le code RETOUR10" },
      { id: "s7", day: 10, type: "task", template: "Appel de courtoisie à {{nom}}" },
    ],
    active: true,
    stats: { sent: 45, opened: 32, replied: 12, converted: 5 },
    createdAt: new Date("2024-02-01"),
  },
  {
    id: "seq3",
    name: "Upsell Premium",
    description: "Pour proposer des produits premium aux bons clients",
    steps: [
      { id: "s8", day: 0, type: "email", subject: "Exclusivité pour nos meilleurs clients", template: "Cher(e) {{nom}},\n\nEn tant que client privilégié de DISTRAM, nous avons le plaisir de vous présenter notre nouvelle gamme premium..." },
      { id: "s9", day: 7, type: "email", subject: "Échantillon gratuit pour {{entreprise}}", template: "Bonjour {{nom}},\n\nPour vous remercier de votre fidélité, nous vous offrons un échantillon de nos nouveaux produits..." },
    ],
    active: false,
    stats: { sent: 28, opened: 22, replied: 8, converted: 3 },
    createdAt: new Date("2024-02-15"),
  },
];

const stepTypeConfig = {
  email: { icon: Mail, color: "text-blue-600", bgColor: "bg-blue-100", label: "Email" },
  task: { icon: Phone, color: "text-amber-600", bgColor: "bg-amber-100", label: "Tâche" },
  sms: { icon: Send, color: "text-green-600", bgColor: "bg-green-100", label: "SMS" },
};

// Email template variables
const templateVariables = [
  { key: "{{nom}}", description: "Nom du contact" },
  { key: "{{entreprise}}", description: "Nom de l'entreprise" },
  { key: "{{ville}}", description: "Ville" },
  { key: "{{commercial}}", description: "Nom du commercial" },
];

export default function AutomationPage() {
  const { } = useUIStore();
  const [sequences, setSequences] = useState<EmailSequence[]>(mockSequences);
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingStep, setEditingStep] = useState<EmailStep | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Form state for new/edit sequence
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    steps: [] as EmailStep[],
  });

  const handleCreateSequence = () => {
    setFormData({ name: "", description: "", steps: [] });
    setIsCreating(true);
    setSelectedSequence(null);
  };

  const handleEditSequence = (sequence: EmailSequence) => {
    setFormData({
      name: sequence.name,
      description: sequence.description || "",
      steps: [...sequence.steps],
    });
    setIsEditing(true);
    setSelectedSequence(sequence);
  };

  const handleSaveSequence = () => {
    if (isEditing && selectedSequence) {
      setSequences(sequences.map(s =>
        s.id === selectedSequence.id
          ? { ...s, name: formData.name, description: formData.description, steps: formData.steps }
          : s
      ));
      toast.success("Séquence mise à jour");
    } else {
      const newSequence: EmailSequence = {
        id: `seq_${Date.now()}`,
        name: formData.name,
        description: formData.description,
        steps: formData.steps,
        active: false,
        stats: { sent: 0, opened: 0, replied: 0, converted: 0 },
        createdAt: new Date(),
      };
      setSequences([...sequences, newSequence]);
      toast.success("Séquence créée");
    }
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleAddStep = (type: EmailStep["type"]) => {
    const maxDay = formData.steps.length > 0
      ? Math.max(...formData.steps.map(s => s.day)) + 3
      : 0;

    const newStep: EmailStep = {
      id: `step_${Date.now()}`,
      day: maxDay,
      type,
      subject: type === "email" ? "" : undefined,
      template: "",
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
    setEditingStep(newStep);
  };

  const handleUpdateStep = (updatedStep: EmailStep) => {
    setFormData({
      ...formData,
      steps: formData.steps.map(s => s.id === updatedStep.id ? updatedStep : s),
    });
    setEditingStep(null);
  };

  const handleDeleteStep = (stepId: string) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter(s => s.id !== stepId),
    });
  };

  const handleToggleActive = (sequenceId: string) => {
    setSequences(sequences.map(s =>
      s.id === sequenceId ? { ...s, active: !s.active } : s
    ));
    const seq = sequences.find(s => s.id === sequenceId);
    toast.success(seq?.active ? "Séquence désactivée" : "Séquence activée");
  };

  const handleGenerateWithAI = async () => {
    setIsGeneratingAI(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (editingStep) {
      const generatedContent = editingStep.type === "email"
        ? "Bonjour {{nom}},\n\nJe me permets de vous contacter car j'ai remarqué que votre établissement {{entreprise}} est en pleine croissance.\n\nChez DISTRAM, nous accompagnons les professionnels de la restauration avec des produits de qualité à des prix compétitifs.\n\nSeriez-vous disponible pour un rapide échange de 10 minutes cette semaine ?\n\nBien cordialement,\n{{commercial}}"
        : editingStep.type === "sms"
          ? "{{nom}}, DISTRAM vous offre -15% sur votre 1ère commande ! Code BIENVENUE15. Appelez-nous au 01 23 45 67 89"
          : "Rappeler {{nom}} de {{entreprise}} pour présenter notre offre";

      setEditingStep({
        ...editingStep,
        template: generatedContent,
        subject: editingStep.type === "email" ? "Partenariat avec {{entreprise}} ?" : editingStep.subject,
      });
    }
    setIsGeneratingAI(false);
    toast.success("Contenu généré par l'IA");
  };

  const handleReorderSteps = (newOrder: EmailStep[]) => {
    setFormData({ ...formData, steps: newOrder });
  };

  const calculateRate = (part: number, total: number) =>
    total > 0 ? Math.round((part / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className={cn("transition-all duration-300 lg:ml-64")}>
        <Header title="Automatisation" subtitle="Séquences d'emails et automatisations de prospection" />

        <main className="p-4 lg:p-6 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Automatisation</h1>
              <p className="text-muted-foreground">
                Séquences d&apos;emails et automatisations de prospection
              </p>
            </div>
            <Button onClick={handleCreateSequence}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle séquence
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Send className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {sequences.reduce((sum, s) => sum + s.stats.sent, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Messages envoyés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Mail className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {calculateRate(
                        sequences.reduce((sum, s) => sum + s.stats.opened, 0),
                        sequences.reduce((sum, s) => sum + s.stats.sent, 0)
                      )}%
                    </p>
                    <p className="text-xs text-muted-foreground">Taux d&apos;ouverture</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <BarChart3 className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {calculateRate(
                        sequences.reduce((sum, s) => sum + s.stats.replied, 0),
                        sequences.reduce((sum, s) => sum + s.stats.sent, 0)
                      )}%
                    </p>
                    <p className="text-xs text-muted-foreground">Taux de réponse</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary-100">
                    <CheckCircle2 className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {sequences.reduce((sum, s) => sum + s.stats.converted, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Conversions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sequences List */}
          <div className="grid lg:grid-cols-2 gap-6">
            {sequences.map((sequence) => (
              <Card key={sequence.id} className="relative overflow-hidden">
                {sequence.active && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-primary-600" />
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {sequence.name}
                        {sequence.active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </CardTitle>
                      {sequence.description && (
                        <CardDescription>{sequence.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleToggleActive(sequence.id)}
                      >
                        {sequence.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEditSequence(sequence)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Steps timeline */}
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    {sequence.steps.map((step, index) => {
                      const config = stepTypeConfig[step.type];
                      const Icon = config.icon;
                      return (
                        <div key={step.id} className="flex items-center">
                          <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                            config.bgColor, config.color
                          )}>
                            <Icon className="h-3 w-3" />
                            J+{step.day}
                          </div>
                          {index < sequence.steps.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{sequence.stats.sent}</p>
                      <p className="text-xs text-muted-foreground">Envoyés</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{calculateRate(sequence.stats.opened, sequence.stats.sent)}%</p>
                      <p className="text-xs text-muted-foreground">Ouverts</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{calculateRate(sequence.stats.replied, sequence.stats.sent)}%</p>
                      <p className="text-xs text-muted-foreground">Réponses</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{sequence.stats.converted}</p>
                      <p className="text-xs text-muted-foreground">Convertis</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || isEditing} onOpenChange={() => { setIsCreating(false); setIsEditing(false); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Modifier la séquence" : "Nouvelle séquence"}
            </DialogTitle>
            <DialogDescription>
              Créez une séquence d&apos;emails automatisés pour vos prospects
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la séquence</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Séquence Nouveau Prospect"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnel)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Pour les prospects identifiés via scraping"
                />
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Étapes de la séquence</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleAddStep("email")}>
                    <Mail className="h-4 w-4 mr-1" /> Email
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleAddStep("task")}>
                    <Phone className="h-4 w-4 mr-1" /> Tâche
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleAddStep("sms")}>
                    <Send className="h-4 w-4 mr-1" /> SMS
                  </Button>
                </div>
              </div>

              {formData.steps.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                  Ajoutez des étapes à votre séquence
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={formData.steps}
                  onReorder={handleReorderSteps}
                  className="space-y-3"
                >
                  {formData.steps.map((step) => {
                    const config = stepTypeConfig[step.type];
                    const Icon = config.icon;
                    return (
                      <Reorder.Item key={step.id} value={step}>
                        <div className={cn(
                          "p-4 rounded-lg border bg-card flex items-start gap-3 cursor-move",
                          config.bgColor.replace("bg-", "border-")
                        )}>
                          <GripVertical className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className={cn("p-2 rounded-lg shrink-0", config.bgColor)}>
                            <Icon className={cn("h-4 w-4", config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary">J+{step.day}</Badge>
                              <span className="text-sm font-medium">{config.label}</span>
                            </div>
                            {step.subject && (
                              <p className="text-sm font-medium truncate">Objet: {step.subject}</p>
                            )}
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {step.template || "Contenu à définir..."}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setEditingStep(step)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteStep(step.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              )}
            </div>

            {/* Variables help */}
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Variables disponibles</p>
              <div className="flex flex-wrap gap-2">
                {templateVariables.map((v) => (
                  <code key={v.key} className="px-2 py-1 text-xs bg-background rounded border">
                    {v.key}
                  </code>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreating(false); setIsEditing(false); }}>
              Annuler
            </Button>
            <Button onClick={handleSaveSequence} disabled={!formData.name || formData.steps.length === 0}>
              {isEditing ? "Enregistrer" : "Créer la séquence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Step Dialog */}
      <Dialog open={!!editingStep} onOpenChange={() => setEditingStep(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Modifier l&apos;étape {editingStep && stepTypeConfig[editingStep.type].label}
            </DialogTitle>
          </DialogHeader>

          {editingStep && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stepDay">Jour d&apos;envoi (J+)</Label>
                  <Input
                    id="stepDay"
                    type="number"
                    min={0}
                    value={editingStep.day}
                    onChange={(e) => setEditingStep({ ...editingStep, day: parseInt(e.target.value) || 0 })}
                  />
                </div>
                {editingStep.type === "email" && (
                  <div className="space-y-2">
                    <Label htmlFor="subject">Objet de l&apos;email</Label>
                    <Input
                      id="subject"
                      value={editingStep.subject || ""}
                      onChange={(e) => setEditingStep({ ...editingStep, subject: e.target.value })}
                      placeholder="Ex: Découvrez notre offre"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="template">
                    {editingStep.type === "email" ? "Contenu de l'email" : editingStep.type === "sms" ? "Message SMS" : "Description de la tâche"}
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateWithAI}
                    disabled={isGeneratingAI}
                  >
                    <Sparkles className={cn("h-4 w-4 mr-1", isGeneratingAI && "animate-spin")} />
                    {isGeneratingAI ? "Génération..." : "Générer avec IA"}
                  </Button>
                </div>
                <Textarea
                  id="template"
                  value={editingStep.template}
                  onChange={(e) => setEditingStep({ ...editingStep, template: e.target.value })}
                  placeholder="Utilisez les variables {{nom}}, {{entreprise}}, etc."
                  rows={8}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {templateVariables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setEditingStep({
                      ...editingStep,
                      template: editingStep.template + v.key,
                    })}
                    className="px-2 py-1 text-xs bg-muted rounded border hover:bg-muted/80 transition-colors"
                  >
                    {v.key} - {v.description}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStep(null)}>
              Annuler
            </Button>
            <Button onClick={() => editingStep && handleUpdateStep(editingStep)}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PhonePreviewButton />
    </div>
  );
}
