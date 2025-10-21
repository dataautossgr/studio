'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  UserPlus,
  Calendar as CalendarIcon,
  Save,
  Car,
  Wrench,
  FileText
} from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  getDoc,
  DocumentReference,
} from 'firebase/firestore';
import type { Customer, Product, RepairJob, RepairJobItem } from '@/lib/data';
import { CustomerDialog } from '@/app/customers/customer-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const mechanics = ['Bilal Ustaad', 'Jameel Bhai', 'Asif Chota', 'Self'];

export default function RepairJobFormPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const jobId = params.id as string;
  const isNew = jobId === 'new';

  // Firestore collections
  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const jobRef = useMemoFirebase(() => isNew ? null : doc(firestore, 'repair_jobs', jobId), [firestore, jobId, isNew]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: jobData, isLoading: jobLoading } = useDoc<RepairJob>(jobRef);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [mechanic, setMechanic] = useState('');
  const [jobNotes, setJobNotes] = useState('');
  const [createdAt, setCreatedAt] = useState<Date>(new Date());

  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

  // Effect to populate form when editing an existing job
  useEffect(() => {
    if (jobData && customers) {
        const fetchCustomer = async () => {
            if (jobData.customer instanceof DocumentReference) {
                const customerSnap = await getDoc(jobData.customer);
                if (customerSnap.exists()) {
                    setSelectedCustomer({ id: customerSnap.id, ...customerSnap.data() } as Customer);
                }
            }
        }
        fetchCustomer();
        setVehicleInfo(jobData.vehicleInfo);
        setMechanic(jobData.mechanic);
        setJobNotes(jobData.notes || '');
        setCreatedAt(new Date(jobData.createdAt));
    }
  }, [jobData, customers]);

  const handleSaveJob = async () => {
    if (!selectedCustomer || !vehicleInfo || !mechanic) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a customer, enter vehicle info, and assign a mechanic.',
      });
      return;
    }

    const batch = writeBatch(firestore);
    
    const jobPayload = {
      customer: doc(firestore, 'customers', selectedCustomer.id),
      vehicleInfo,
      mechanic,
      notes: jobNotes,
      status: jobData?.status || 'In Progress',
      createdAt: createdAt.toISOString(),
      total: jobData?.total || 0,
      items: jobData?.items || [],
    };

    if (isNew) {
      const newJobRef = doc(collection(firestore, 'repair_jobs'));
      const newJobId = `JOB-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      batch.set(newJobRef, { ...jobPayload, jobId: newJobId });
      toast({ title: 'Job Created', description: `Job ${newJobId} has been created.` });
      router.push(`/repair-jobs/${newJobRef.id}`);
    } else {
      batch.update(jobRef!, jobPayload);
      toast({ title: 'Job Updated', description: `Job ${jobData?.jobId} has been updated.` });
    }

    try {
        await batch.commit();
    } catch (error) {
        console.error("Error saving job:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save the job." });
    }
  };
  
  const isLoading = customersLoading || jobLoading;
  const pageTitle = isNew ? 'Create New Repair Job' : `Edit Job - ${jobData?.jobId || ''}`;


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            {isNew ? 'Fill in the details for the new job.' : 'Update the job details below.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {isLoading ? (
                <div className="space-y-8">
                    <div className="h-10 w-1/2 bg-muted rounded-md animate-pulse" />
                    <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                    <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                    <div className="h-24 w-full bg-muted rounded-md animate-pulse" />
                </div>
            ) : (
                <>
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Customer Selection */}
                    <div className="space-y-2">
                        <Label>Customer</Label>
                        <div className="flex gap-2">
                        <Select
                            value={selectedCustomer?.id || ''}
                            onValueChange={(customerId) => {
                            const customer = customers?.find(c => c.id === customerId);
                            setSelectedCustomer(customer || null);
                            if (customer) setVehicleInfo(customer.vehicleDetails);
                            }}
                        >
                            <SelectTrigger>
                            <SelectValue placeholder="Select a registered customer" />
                            </SelectTrigger>
                            <SelectContent>
                            {customers?.filter(c=>c.type==='registered').map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} ({customer.phone})
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => setIsCustomerDialogOpen(true)}>
                            <UserPlus className="h-4 w-4" />
                        </Button>
                        </div>
                    </div>

                    {/* Job Date */}
                    <div className="space-y-2">
                        <Label>Job Date</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={'outline'}
                            className={cn('w-full justify-start text-left font-normal', !createdAt && 'text-muted-foreground')}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {createdAt ? format(createdAt, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={createdAt} onSelect={(d) => setCreatedAt(d || new Date())} initialFocus />
                        </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                     {/* Vehicle Info */}
                    <div className="space-y-2">
                        <Label htmlFor="vehicleInfo">Vehicle Info (Model, Reg #)</Label>
                        <div className="relative">
                            <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input id="vehicleInfo" value={vehicleInfo} onChange={(e) => setVehicleInfo(e.target.value)} placeholder="e.g., Corolla GLI, LEB-21-5555" className="pl-10" />
                        </div>
                    </div>

                    {/* Mechanic */}
                    <div className="space-y-2">
                        <Label htmlFor="mechanic">Assigned Mechanic</Label>
                         <div className="relative">
                            <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Select value={mechanic} onValueChange={setMechanic}>
                                <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Select a mechanic" />
                                </SelectTrigger>
                                <SelectContent>
                                {mechanics.map((m) => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Job Notes */}
                <div className="space-y-2">
                    <Label htmlFor="jobNotes">Job Description / Notes</Label>
                     <div className="relative">
                        <FileText className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Textarea id="jobNotes" value={jobNotes} onChange={(e) => setJobNotes(e.target.value)} placeholder="e.g., General tuning, brake service, and gear oil change..." className="pl-10" />
                    </div>
                </div>
                </>
            )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/repair-jobs')}>Cancel</Button>
            <Button onClick={handleSaveJob} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isNew ? 'Create Job' : 'Save Changes'}
            </Button>
        </CardFooter>
      </Card>
      
      <CustomerDialog 
        isOpen={isCustomerDialogOpen} 
        onClose={() => setIsCustomerDialogOpen(false)}
        onSave={() => { /* Implement save logic here if needed */ }}
        customer={null}
      />
    </div>
  );
}

