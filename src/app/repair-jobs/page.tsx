'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  MoreVertical,
  Filter,
  Car,
  Wrench,
  User,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, DocumentReference, getDoc } from 'firebase/firestore';
import type { RepairJob, Customer } from '@/lib/data';
import { format, formatDistanceToNow } from 'date-fns';

interface EnrichedRepairJob extends Omit<RepairJob, 'customer'> {
    customer: Customer | null;
}

export default function RepairJobsPage() {
  const [activeJobs, setActiveJobs] = useState<EnrichedRepairJob[]>([]);
  const firestore = useFirestore();
  const repairJobsCollection = useMemoFirebase(() => collection(firestore, 'repair_jobs'), [firestore]);
  const { data: jobs, isLoading } = useCollection<RepairJob>(repairJobsCollection);

  useEffect(() => {
    if (!jobs) return;

    const enrichJobs = async () => {
      const enriched = await Promise.all(
        jobs
        .filter(j => j.status === 'In Progress' || j.status === 'Paused')
        .map(async (job) => {
            let customerData: Customer | null = null;
            if (job.customer && job.customer instanceof DocumentReference) {
                const customerSnap = await getDoc(job.customer);
                if (customerSnap.exists()) {
                    customerData = { id: customerSnap.id, ...customerSnap.data() } as Customer;
                }
            }
            return { ...job, customer: customerData };
        })
      );
      setActiveJobs(enriched.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };

    enrichJobs();
  }, [jobs]);
  
  const getStatusVariant = (status: RepairJob['status']) => {
    switch (status) {
      case 'In Progress':
        return 'default';
      case 'Paused':
        return 'secondary';
      case 'Completed':
        return 'outline';
      case 'Cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Repair Jobs</h1>
          <p className="text-muted-foreground">
            Track and manage all ongoing vehicle repairs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter Jobs
          </Button>
          <Button asChild>
            <Link href="/repair-jobs/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Job
            </Link>
          </Button>
        </div>
      </div>
      
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
             {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                    <CardHeader>
                        <div className="h-5 w-2/3 bg-muted rounded-md" />
                        <div className="h-4 w-1/2 bg-muted rounded-md" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <div className="h-4 w-full bg-muted rounded-md" />
                         <div className="h-4 w-3/4 bg-muted rounded-md" />
                         <div className="h-4 w-full bg-muted rounded-md" />
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <div className="h-8 w-24 bg-muted rounded-md" />
                        <div className="h-8 w-20 bg-muted rounded-md" />
                    </CardFooter>
                </Card>
            ))}
        </div>
      )}

      {!isLoading && activeJobs.length === 0 && (
         <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Active Jobs</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating a new repair job.
            </p>
            <Button asChild className="mt-6">
                <Link href="/repair-jobs/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create First Job
                </Link>
            </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {activeJobs.map((job) => (
          <Card key={job.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{job.jobId}</CardTitle>
                    <CardDescription>{format(new Date(job.createdAt), 'dd MMM, yyyy')}</CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-grow">
               <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{job.customer?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <Car className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{job.vehicleInfo}</span>
                </div>
                 <div className="flex items-center gap-3 text-sm">
                    <Wrench className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{job.mechanic}</span>
                </div>
                 <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 p-3">
              <div className="font-bold">
                Rs. {job.total.toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                 <Button variant="secondary" size="sm" asChild>
                    <Link href={`/repair-jobs/${job.id}`}>View/Edit</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Finalize & Bill</DropdownMenuItem>
                    <DropdownMenuItem>Pause Job</DropdownMenuItem>
                    <DropdownMenuItem>Cancel Job</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

