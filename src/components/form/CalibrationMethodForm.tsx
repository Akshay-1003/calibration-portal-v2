import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { calibrationMethodFormSchema, zodResolver, type CalibrationMethodFormData } from '../../lib/validations';

// Types
interface GradeMethodData {
  diameter: string;
  grade: string;
}

interface ToleranceMethodData {
  basic_size: string;
  upperTolerance: string;
  lowerTolerance: string;
}

interface CalibrationMethodFormProps {
  onCalculate: (method: 'grade' | 'tolerance', data: any) => void;
  loading?: boolean;
}

// Constants
const GRADES = [
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H12',
  'JS1', 'JS2', 'JS3', 'JS4', 'JS5', 'JS6', 'JS7', 'JS8', 'JS9', 'JS10', 'JS11', 'JS12',
  'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10', 'K11', 'K12',
  'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12',
  'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10', 'N11', 'N12',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12',
  'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12',
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12',
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
  'U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12',
  'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12',
  'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8', 'X9', 'X10', 'X11', 'X12',
  'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12',
  'Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'Z10', 'Z11', 'Z12',
];

export const CalibrationMethodForm: React.FC<CalibrationMethodFormProps> = ({
  onCalculate,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'grade' | 'tolerance'>('grade');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CalibrationMethodFormData>({
    resolver: zodResolver(calibrationMethodFormSchema),
    defaultValues: {
      method: 'grade',
      diameter: '',
      grade: '',
      basic_size: '',
      upperTolerance: '',
      lowerTolerance: '',
    },
    mode: 'onChange',
  });
  void register;
  void handleSubmit;
  void errors;
  void setValue;

  const watchedValues = watch();
  void watchedValues;

  const handleGradeDataChange = useCallback((field: keyof GradeMethodData, value: string) => {
    setGradeData((prev: GradeMethodData) => ({ ...prev, [field]: value }));
  }, []);

  const handleToleranceDataChange = useCallback((field: keyof ToleranceMethodData, value: string) => {
    setToleranceData((prev: ToleranceMethodData) => ({ ...prev, [field]: value }));
  }, []);

  const handleGradeCalculate = useCallback(() => {
    if (!gradeData.diameter || !gradeData.grade) {
      toast.error('Please fill in all required fields for Grade Method');
      return;
    }

    onCalculate('grade', gradeData);
  }, [gradeData, onCalculate]);

  const handleToleranceCalculate = useCallback(() => {
    if (!toleranceData.basic_size || !toleranceData.upperTolerance || !toleranceData.lowerTolerance) {
      toast.error('Please fill in all required fields for Tolerance Method');
      return;
    }

    onCalculate('tolerance', toleranceData);
  }, [toleranceData, onCalculate]);

  const isGradeFormValid = useMemo(() => {
    return gradeData.diameter && gradeData.grade;
  }, [gradeData]);

  const isToleranceFormValid = useMemo(() => {
    return toleranceData.basic_size && toleranceData.upperTolerance && toleranceData.lowerTolerance;
  }, [toleranceData]);

  const GradeMethodForm = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Grade Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="diameter">Diameter (mm) *</Label>
            <Input
              id="diameter"
              type="number"
              step="0.001"
              value={gradeData.diameter}
              onChange={(e) => handleGradeDataChange('diameter', e.target.value)}
              placeholder="Enter diameter"
            />
          </div>
          
          <div>
            <Label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">Grade <span className="text-red-500 ml-1">*</span></Label>
            <select
              id="grade"
              value={gradeData.grade}
              onChange={(e) => handleGradeDataChange('grade', e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select grade</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <Button
          onClick={handleGradeCalculate}
          disabled={loading || !isGradeFormValid}
          className="w-full"
        >
          {loading ? 'Calculating...' : 'Calculate Grade Method'}
        </Button>
      </CardContent>
    </Card>
  ), [gradeData, handleGradeDataChange, handleGradeCalculate, loading, isGradeFormValid]);

  const ToleranceMethodForm = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Tolerance Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="basic_size">Basic Size (mm) *</Label>
            <Input
              id="basic_size"
              type="number"
              step="0.001"
              value={toleranceData.basic_size}
              onChange={(e) => handleToleranceDataChange('basic_size', e.target.value)}
              placeholder="Enter basic size"
            />
          </div>
          
          <div>
            <Label htmlFor="upperTolerance">Upper Tolerance (mm) *</Label>
            <Input
              id="upperTolerance"
              type="number"
              step="0.001"
              value={toleranceData.upperTolerance}
              onChange={(e) => handleToleranceDataChange('upperTolerance', e.target.value)}
              placeholder="Enter upper tolerance"
            />
          </div>
          
          <div>
            <Label htmlFor="lowerTolerance">Lower Tolerance (mm) *</Label>
            <Input
              id="lowerTolerance"
              type="number"
              step="0.001"
              value={toleranceData.lowerTolerance}
              onChange={(e) => handleToleranceDataChange('lowerTolerance', e.target.value)}
              placeholder="Enter lower tolerance"
            />
          </div>
        </div>
        
        <Button
          onClick={handleToleranceCalculate}
          disabled={loading || !isToleranceFormValid}
          className="w-full"
        >
          {loading ? 'Calculating...' : 'Calculate Tolerance Method'}
        </Button>
      </CardContent>
    </Card>
  ), [toleranceData, handleToleranceDataChange, handleToleranceCalculate, loading, isToleranceFormValid]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'grade' | 'tolerance')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grade">Grade Method</TabsTrigger>
          <TabsTrigger value="tolerance">Tolerance Method</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grade">
          {GradeMethodForm}
        </TabsContent>
        
        <TabsContent value="tolerance">
          {ToleranceMethodForm}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalibrationMethodForm;
