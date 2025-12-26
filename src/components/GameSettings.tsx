import { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpCircle, Settings2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type GameMode = 'mafia' | 'one_night';
export type Language = 'en' | 'he';

export interface RoleCounts {
  werewolves: number;
  doctors: number;
  seers: number;
  villagers: number;
}

export interface CustomRoleNames {
  werewolf: string;
  doctor: string;
  seer: string;
  villager: string;
}

export interface GameSettingsData {
  language: Language;
  gameMode: GameMode;
  roleCounts: RoleCounts;
  useCustomNames: boolean;
  customRoleNames: CustomRoleNames;
}

interface GameSettingsProps {
  playerCount: number;
  onSettingsChange: (settings: GameSettingsData) => void;
}

export const GameSettings = ({ playerCount, onSettingsChange }: GameSettingsProps) => {
  const [language, setLanguage] = useState<Language>('en');
  const [gameMode, setGameMode] = useState<GameMode>('mafia');
  const [useCustomNames, setUseCustomNames] = useState(false);
  
  // Calculate default role counts based on player count
  const defaultWerewolves = Math.max(1, Math.floor(playerCount / 4));
  const defaultDoctors = playerCount >= 3 ? 1 : 0;
  const defaultSeers = playerCount >= 5 ? 1 : 0;
  const defaultVillagers = Math.max(0, playerCount - defaultWerewolves - defaultDoctors - defaultSeers);

  const [roleCounts, setRoleCounts] = useState<RoleCounts>({
    werewolves: defaultWerewolves,
    doctors: defaultDoctors,
    seers: defaultSeers,
    villagers: defaultVillagers,
  });

  const [customRoleNames, setCustomRoleNames] = useState<CustomRoleNames>({
    werewolf: '',
    doctor: '',
    seer: '',
    villager: '',
  });

  const updateSettings = (updates: Partial<GameSettingsData>) => {
    const newSettings: GameSettingsData = {
      language,
      gameMode,
      roleCounts,
      useCustomNames,
      customRoleNames,
      ...updates,
    };
    onSettingsChange(newSettings);
  };

  const handleLanguageChange = (value: Language) => {
    setLanguage(value);
    updateSettings({ language: value });
  };

  const handleGameModeChange = (value: GameMode) => {
    setGameMode(value);
    updateSettings({ gameMode: value });
  };

  const handleRoleCountChange = (role: keyof RoleCounts, value: string) => {
    const num = parseInt(value) || 0;
    const newCounts = { ...roleCounts, [role]: Math.max(0, num) };
    setRoleCounts(newCounts);
    updateSettings({ roleCounts: newCounts });
  };

  const handleCustomNameChange = (role: keyof CustomRoleNames, value: string) => {
    const newNames = { ...customRoleNames, [role]: value };
    setCustomRoleNames(newNames);
    updateSettings({ customRoleNames: newNames });
  };

  const handleUseCustomNamesChange = (checked: boolean) => {
    setUseCustomNames(checked);
    updateSettings({ useCustomNames: checked });
  };

  return (
    <div className="space-y-6 bg-card/30 border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-foreground">
        <Settings2 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Game Settings</h3>
      </div>

      {/* Language & Mode Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Language Selector */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Language</Label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="he">עברית (Hebrew)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Game Mode */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label className="text-sm text-muted-foreground">Game Mode</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-popover border border-border">
                  <p><strong>Mafia:</strong> Multi-round, players are eliminated each round.</p>
                  <p className="mt-1"><strong>One Night:</strong> Single round, everyone votes at the end.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select value={gameMode} onValueChange={handleGameModeChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="mafia">Mafia (Continuous)</SelectItem>
              <SelectItem value="one_night">One Night</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Role Configuration */}
      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground">Role Counts</Label>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Werewolves</Label>
            <Input
              type="number"
              min={1}
              max={playerCount}
              value={roleCounts.werewolves}
              onChange={(e) => handleRoleCountChange('werewolves', e.target.value)}
              className="h-9 text-center bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Doctors</Label>
            <Input
              type="number"
              min={0}
              max={playerCount}
              value={roleCounts.doctors}
              onChange={(e) => handleRoleCountChange('doctors', e.target.value)}
              className="h-9 text-center bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Seers</Label>
            <Input
              type="number"
              min={0}
              max={playerCount}
              value={roleCounts.seers}
              onChange={(e) => handleRoleCountChange('seers', e.target.value)}
              className="h-9 text-center bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Villagers</Label>
            <Input
              type="number"
              min={0}
              max={playerCount}
              value={roleCounts.villagers}
              onChange={(e) => handleRoleCountChange('villagers', e.target.value)}
              className="h-9 text-center bg-background"
            />
          </div>
        </div>
      </div>

      {/* Custom Role Names Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">Role Naming</Label>
            <p className="text-xs text-muted-foreground">
              {useCustomNames ? 'Manual Customization' : 'AI Generated'}
            </p>
          </div>
          <Switch
            checked={useCustomNames}
            onCheckedChange={handleUseCustomNamesChange}
          />
        </div>

        {/* Custom Name Inputs */}
        {useCustomNames && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Werewolf →</Label>
              <Input
                placeholder="e.g., Rasar"
                value={customRoleNames.werewolf}
                onChange={(e) => handleCustomNameChange('werewolf', e.target.value)}
                className="h-9 bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Doctor →</Label>
              <Input
                placeholder="e.g., Medic"
                value={customRoleNames.doctor}
                onChange={(e) => handleCustomNameChange('doctor', e.target.value)}
                className="h-9 bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Seer →</Label>
              <Input
                placeholder="e.g., Scout"
                value={customRoleNames.seer}
                onChange={(e) => handleCustomNameChange('seer', e.target.value)}
                className="h-9 bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Villager →</Label>
              <Input
                placeholder="e.g., Soldier"
                value={customRoleNames.villager}
                onChange={(e) => handleCustomNameChange('villager', e.target.value)}
                className="h-9 bg-background"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
