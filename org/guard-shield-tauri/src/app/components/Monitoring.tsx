import { Clock, Info } from 'lucide-react';
import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip as ToolTip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

type Props = object;

const Monitoring = (props: Props) => {
  const data = [
    {
      name: 'Page A',
      uv: 4000,
      pv: 2400,
      amt: 2400,
    },
    {
      name: 'Page B',
      uv: 3000,
      pv: 1398,
      amt: 2210,
    },
    {
      name: 'Page C',
      uv: 2000,
      pv: 9800,
      amt: 2290,
    },
    {
      name: 'Page D',
      uv: 2780,
      pv: 3908,
      amt: 2000,
    },
    {
      name: 'Page E',
      uv: 1890,
      pv: 4800,
      amt: 2181,
    },
    {
      name: 'Page F',
      uv: 2390,
      pv: 3800,
      amt: 2500,
    },
    {
      name: 'Page G',
      uv: 3490,
      pv: 4300,
      amt: 2100,
    },
  ];

  const tableData = [
    {
      impact: 6.7,
      severity: 'Medium',
      ID: '11',
      port: '80',
      protocol: 'http',
    },
    {
      impact: 4.7,
      severity: 'Medium',
      ID: '12',
      port: '80',
      protocol: 'http',
    },
    {
      impact: 2.7,
      severity: 'Low',
      ID: '13',
      port: '80',
      protocol: 'http',
    },
    {
      impact: 9.7,
      severity: 'Critical',
      ID: '15',
      port: '80',
      protocol: 'http',
    },
    {
      impact: 9.7,
      severity: 'High',
      ID: '14',
      port: '80',
      protocol: 'http',
    },
    {
      impact: 0.7,
      severity: 'High',
      ID: '17',
      port: '80',
      protocol: 'http',
    },
  ];


  return (
    <div className="border rounded-md p-4">
      <h1 className="text-sm font-semibold tracking-widest flex gap-12">
        INTRUSION ATTEMPTS
        <p className="flex gap-12 font-normal tracking-normal">
          Total : 0{' '}
          <span className="flex gap-3">
            <Clock className="h-4 w-4" />
            24 Hrs. : 0
          </span>
        </p>
      </h1>
      <div>
        <LineChart className="my-6" data={data} width={1200} height={200}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <ToolTip />
          <Legend />
          <Line type="monotone" dataKey="pv" stroke="#8884d8" />
          <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
        </LineChart>
        <ScrollArea className="h-[13rem]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="flex gap-3 items-center text-center">
                  Impact Score{' '}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="text-blue-500 h-4 w-4 cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-72">
                          Impact Score represents the calculated risk or
                          potential effect of an intrusion attempt, based on
                          various factors associated with each unique ID. It is
                          distinct from Severity, which categorizes the overall
                          threat level.
                        </p>
                      </TooltipContent>
                    </Tooltip>{' '}
                  </TooltipProvider>
                </TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Port</TableHead>
                <TableHead className="text-right">Protocol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((item) => {
                return (
                  <TableRow key={item.ID} className="">
                    <TableCell className="font-medium w-[15%]">
                      <Badge
                        className={`rounded-sm px-2 text-md ${
                          item.impact < 10 && item.impact > 8
                            ? 'bg-red-500'
                            : item.impact > 6
                            ? 'bg-orange-500'
                            : item.impact > 4
                            ? 'bg-yellow-300'
                            : 'bg-green-500'
                        } `}
                      >
                        {' '}
                        {item.impact}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {' '}
                      <Badge
                        className={`text-md  rounded-sm text-center ${
                          item.severity === 'Critical'
                            ? 'bg-red-500'
                            : item.severity === 'High'
                            ? 'bg-orange-500'
                            : item.severity === 'Medium'
                            ? 'bg-yellow-300'
                            : 'bg-green-500'
                        } `}
                      >
                        {' '}
                        {item.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.port}</TableCell>
                    <TableCell className="text-right">
                      {item.protocol}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Monitoring;
