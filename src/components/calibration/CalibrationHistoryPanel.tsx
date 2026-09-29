import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Card, Chip, Spinner } from '@heroui/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useInwardGaugeStore, type CalibrationHistoryEntry } from '../../store/inwardGaugeStore';
import { Badge } from '../ui/badge';
import { GaugeTypeCalibrationRenderer } from './GaugeTypeCalibrationRenderer';
import { ReadOnlyFormProvider } from './ReadOnlyFormProvider';
import { logger } from '../../utils/logger';

interface CalibrationHistoryPanelProps {
  identificationNumber: string;
  currentInwardId?: string; // Exclude current calibration from history
}

export const CalibrationHistoryPanel: React.FC<CalibrationHistoryPanelProps> = ({
  identificationNumber,
  currentInwardId,
}) => {
  const { fetchCalibrationHistory, getCachedCalibrationHistory, loading } = useInwardGaugeStore();
  const [history, setHistory] = useState<CalibrationHistoryEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!identificationNumber) return;

    const loadHistory = async () => {
      try {
        // Check cache first
        const cached = getCachedCalibrationHistory(identificationNumber);
        if (cached && cached.length > 0) {
          setHistory(cached);
          return;
        }

        // Fetch from API
        const data = await fetchCalibrationHistory(identificationNumber);
        setHistory(data || []);
      } catch (error) {
        logger.error('Failed to load calibration history:', error);
        setHistory([]);
      }
    };

    loadHistory();
  }, [identificationNumber, fetchCalibrationHistory, getCachedCalibrationHistory]);

  // Filter out current calibration if provided (memoized)
  const filteredHistory = useMemo(() => {
    return currentInwardId
      ? history.filter((entry) => entry.inward_id !== currentInwardId)
      : history;
  }, [history, currentInwardId]);

  // Sort by date (most recent first) - memoized expensive calculation
  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      const dateA = new Date(a.calibration_date || a.created_at).getTime();
      const dateB = new Date(b.calibration_date || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [filteredHistory]);

  // Memoize formatDate function
  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }, []);


  if (loading.loadingCalibrationHistory && history.length === 0) {
    return (
      <Card className="border border-gray-200 dark:border-border">
        <Card.Content className="p-4">
          <div className="flex items-center justify-center gap-2">
            <Spinner size="sm" />
            <span className="text-sm text-muted-foreground">Loading calibration history...</span>
          </div>
        </Card.Content>
      </Card>
    );
  }

  if (sortedHistory.length === 0) {
    return (
      <Card className="border border-gray-200 dark:border-border">
        <Card.Content className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClockIcon className="w-4 h-4" />
            <span>No previous calibration history found for this gauge.</span>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 dark:border-border">
      <Card.Content className="p-0">
        <Accordion
          value={isExpanded ? ['history'] : []}
          onValueChange={(value) => setIsExpanded(value.includes('history'))}
        >
          <AccordionItem value="history">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <span className="font-semibold text-foreground">
                  Previous Calibration History ({sortedHistory.length})
                </span>
                <Chip size="sm" variant="soft" color="accent" className="ml-auto">
                  Reference Data
                </Chip>
              </div>
            </AccordionTrigger>
            <AccordionContent>
            <div className="space-y-4 pt-2 max-h-[600px] overflow-y-auto">
              {sortedHistory.map((entry, index) => (
                <HistoryEntryCard
                  key={entry.id}
                  entry={entry}
                  index={index}
                  totalEntries={sortedHistory.length}
                  formatDate={formatDate}
                />
              ))}
            </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card.Content>
    </Card>
  );
};

// Memoized history entry card component to prevent unnecessary re-renders
interface HistoryEntryCardProps {
  entry: CalibrationHistoryEntry;
  index: number;
  totalEntries: number;
  formatDate: (dateString: string) => string;
}

const HistoryEntryCard = memo<HistoryEntryCardProps>(({ entry, index, totalEntries, formatDate }) => {
  return (
    <Card
      className="border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/50"
    >
      <Card.Content className="p-4 space-y-3">
                    {/* Header Section */}
                    <div className="flex items-start justify-between pb-3 border-b border-gray-200 dark:border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                            #{totalEntries - index}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatDate(entry.calibration_date || entry.created_at)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              Lab ID: {entry.inward_gauge_lab_id || 'N/A'}
                            </p>
                            {entry.client_org_name && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <p className="text-xs text-muted-foreground">{entry.client_org_name}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {entry.status === 'calibration_completed' && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-300 dark:border-green-800">
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                        <Chip
                          size="sm"
                          variant="soft"
                          color={entry.calibration_done_under === 'nabl' ? 'accent' : 'default'}
                        >
                          {entry.calibration_done_under === 'nabl' ? 'NABL' : 'Non-NABL'}
                        </Chip>
                      </div>
                    </div>

                    {/* Calibration Observations - Using Same Renderer */}
                    {entry.observations && entry.certificate_type && (
                      <div className="pt-2">
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Observations Reference
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Gauge Type: {entry.master_gauge_name || entry.certificate_type}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3">
                          <ReadOnlyFormProvider
                            defaultValues={{
                              observations: entry.observations || {},
                              specifications: entry.specifications || {},
                            }}
                          >
                            <GaugeTypeCalibrationRenderer
                              certificate_type={entry.certificate_type}
                              onCancel={() => {}}
                              observations={entry.observations}
                              specifications={entry.specifications}
                              isReadOnly={true}
                              master_readings={[]}
                            />
                          </ReadOnlyFormProvider>
                        </div>
                      </div>
                    )}

                    {/* Fallback if no certificate type or observations */}
                    {(!entry.observations || !entry.certificate_type) && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No observation data available for this calibration record.
                      </div>
                    )}
                  </Card.Content>
                </Card>
  );
}, (prev, next) => {
  // Custom comparison function for React.memo
  return (
    prev.entry.id === next.entry.id &&
    prev.entry.status === next.entry.status &&
    prev.entry.calibration_date === next.entry.calibration_date &&
    prev.index === next.index &&
    prev.totalEntries === next.totalEntries
  );
});

HistoryEntryCard.displayName = 'HistoryEntryCard';
