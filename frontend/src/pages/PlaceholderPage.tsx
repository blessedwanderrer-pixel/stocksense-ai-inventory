import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Clock, ArrowLeft } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  stage: 'Stage 2' | 'Stage 3';
  description: string;
  scopeSummary: string[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  stage,
  description,
  scopeSummary,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboardPath = user?.role === 'manager' ? '/manager' : '/staff';

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`Planned module scheduled for release in ${stage}.`}
        showRefresh={false}
      />

      <Card className="max-w-2xl border-dashed">
        <CardContent className="p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Scheduled for {stage}
              </span>
              <h3 className="text-base font-semibold text-zinc-900 mt-1">
                {title} Module
              </h3>
            </div>
          </div>

          <p className="text-sm text-zinc-600 leading-relaxed">
            {description}
          </p>

          <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
              Planned Scope:
            </h4>
            <ul className="text-xs text-zinc-600 space-y-1.5 list-disc pl-4">
              {scopeSummary.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(dashboardPath)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Return to Active Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
