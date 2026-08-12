import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { 
  BarChart3, 
  BrainCircuit, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle2,
  PackageSearch,
  Zap,
  Globe2,
  Workflow,
  ChevronDown,
  Plug,
  Database
} from 'lucide-react';

// Reusable FAQ Item Component
function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full py-6 flex justify-between items-center text-left focus:outline-none"
      >
        <span className="text-lg font-bold text-slate-900">{question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pb-6 text-slate-600 leading-relaxed pr-8">
          {answer}
        </div>
      )}
    </div>
  );
}

// Demo Modal Component
function DemoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/public/demo-request', formData);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        setFormData({ name: '', email: '', company: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error('Failed to submit demo request', error);
      alert('Failed to submit request. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Request Sent!</h3>
            <p className="text-slate-600">Our team will be in touch with you shortly to schedule your demo.</p>
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Request a Demo</h3>
            <p className="text-slate-600 mb-6">See how StockSavvy can transform your operations.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0066CC] focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Work Email *</label>
                <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0066CC] focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <input type="text" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0066CC] focus:border-transparent outline-none" />
              </div>
              <button 
                disabled={isSubmitting}
                type="submit" 
                className="w-full bg-[#0066CC] hover:bg-[#0052a3] text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-70 mt-4"
              >
                {isSubmitting ? 'Sending...' : 'Request Demo'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Dynamic Data State
  const [stats, setStats] = useState({
    fulfillmentIncrease: '24%',
    accuracy: '99.9%',
    warehouses: '3k+',
    discrepancies: '0'
  });
  
  const [plans, setPlans] = useState([
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for small businesses getting started.',
      price: 29,
      isPopular: false,
      features: ['Up to 500 SKUs', '1 User Account', 'Basic Inventory Tracking', 'Manual Purchase Orders']
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For growing businesses leveraging AI.',
      price: 99,
      isPopular: true,
      features: ['Unlimited SKUs', 'Up to 5 User Accounts', 'Advanced AI Demand Forecasting', 'Automated Purchase Orders', 'Priority Support']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large scale operations.',
      price: null, // Custom
      isPopular: false,
      features: ['Dedicated AI Assistant', 'Advanced RAG Analytics', 'Unlimited Users', 'Custom Integrations', '24/7 Phone Support']
    }
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch dynamic data from backend
    const fetchLandingData = async () => {
      try {
        const statsData = await api.get<any>('/public/landing-stats');
        if (statsData) setStats(statsData);

        const plansData = await api.get<any[]>('/public/plans');
        if (plansData && plansData.length > 0) setPlans(plansData);
      } catch (err) {
        // Fallback to static data if backend is not yet available
        console.warn('Backend not available yet, using default landing data.', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLandingData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
              <img src="/stocksavvy_logo.png" alt="StockSavvy Logo" className="w-10 h-10 shrink-0 object-contain" />
              <span className="text-[20px] font-black text-gray-900 tracking-tight">StockSavvy</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Features</a>
              <a href="#how-it-works" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">How it works</a>
              <a href="#pricing" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Pricing</a>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/login')}
                className="hidden md:block font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="bg-[#0066CC] hover:bg-[#0052a3] text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg shadow-[#0066CC]/25 flex items-center gap-2"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm mb-6 border border-blue-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              AI-Powered Management
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900 mb-6">
              Optimize Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400">Stock.</span><br />
              Scale Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400">Business.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
              Achieve perfect inventory control, real-time tracking, and AI-driven predictive insights with StockSavvy's modern management platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="bg-[#0066CC] hover:bg-[#0052a3] text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-[#0066CC]/30 flex items-center justify-center gap-2"
              >
                Start 14-Day Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsDemoModalOpen(true)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-sm flex items-center justify-center"
              >
                Request a Demo
              </button>
            </div>
            
            <div className="mt-8 flex items-center gap-4 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card required</div>
              <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Cancel anytime</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:h-[600px] flex items-center justify-center"
          >
            {/* Decorative background blur */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-teal-50 rounded-full blur-3xl opacity-50"></div>
            
            {/* Dashboard Mockup Graphic */}
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Stock Value</h3>
                    <div className="text-3xl font-bold text-slate-900 mt-1">$124,500.00</div>
                  </div>
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> +14.5%
                  </div>
                </div>
                
                {/* Mock Chart Area */}
                <div className="h-40 w-full bg-slate-50 rounded-xl mb-6 relative overflow-hidden flex items-end">
                   {/* Abstract chart bars */}
                   <div className="w-full h-full flex items-end gap-2 px-4 pb-4">
                     {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                       <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-teal-400 rounded-t-sm opacity-80" style={{ height: `${h}%` }}></div>
                     ))}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                    <div className="text-xs text-slate-500 font-semibold mb-1">Low Stock Items</div>
                    <div className="text-2xl font-bold text-slate-800">12</div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                    <div className="text-xs text-slate-500 font-semibold mb-1">Pending Orders</div>
                    <div className="text-2xl font-bold text-slate-800">34</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-10 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-wider mb-8">Trusted by innovative companies worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale">
             <div className="text-xl font-black text-slate-800">ACME Corp</div>
             <div className="text-xl font-black text-slate-800">GlobalTech</div>
             <div className="text-xl font-black text-slate-800">Nexus Industries</div>
             <div className="text-xl font-black text-slate-800">Quantum Logistics</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-slate-50">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Empower Your Inventory with Smart Tools</h2>
          <p className="text-xl text-slate-600">Our platform is designed to simplify complex inventory management, providing actionable insights tailored to your workflow.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: <BrainCircuit className="w-6 h-6 text-blue-600" />,
              title: 'AI Demand Forecasting',
              desc: 'Predict future stock needs with high accuracy using our advanced machine learning models.'
            },
            {
              icon: <Zap className="w-6 h-6 text-teal-500" />,
              title: 'Automated Purchase Orders',
              desc: 'Never run out of stock. Automatically generate POs when inventory hits custom thresholds.'
            },
            {
              icon: <Globe2 className="w-6 h-6 text-indigo-500" />,
              title: 'Multi-Warehouse Management',
              desc: 'Track and transfer stock across multiple locations globally from a single dashboard.'
            },
            {
              icon: <PackageSearch className="w-6 h-6 text-purple-500" />,
              title: 'Real-Time Tracking',
              desc: 'Stay informed with a clear, organized view of every item entering or leaving your warehouse.'
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-pink-500" />,
              title: 'Advanced Analytics',
              desc: 'Generate custom reports on sales velocity, profit margins, and dead stock.'
            },
            {
              icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
              title: 'Role-Based Access',
              desc: 'Secure your data by assigning granular permissions to staff and branch managers.'
            }
          ].map((feature, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">How StockSavvy Works in 3 Simple Steps</h2>
            <p className="text-xl text-slate-600">A streamlined process to take you from chaos to complete control.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-6 shadow-sm border border-blue-100">1</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Connect Your Data</h3>
              <p className="text-slate-600">Easily import your existing SKUs via CSV or integrate directly with your current sales channels.</p>
              <div className="hidden md:block absolute top-10 left-2/3 w-full h-[2px] bg-gradient-to-r from-blue-200 to-transparent"></div>
            </div>
            
            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-6 shadow-sm border border-teal-100">2</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">AI Analysis</h3>
              <p className="text-slate-600">Our system analyzes your sales history, seasonality, and trends to set optimal stock levels.</p>
              <div className="hidden md:block absolute top-10 left-2/3 w-full h-[2px] bg-gradient-to-r from-teal-200 to-transparent"></div>
            </div>

            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-6 shadow-sm border border-indigo-100">3</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Automate Operations</h3>
              <p className="text-slate-600">Let the platform automatically generate purchase orders and notify you before stock runs out.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Why ambitious businesses trust StockSavvy</h2>
              <p className="text-xl text-slate-400 mb-8">We've helped thousands of companies streamline their inventory, reduce stockouts, and drastically improve their bottom line.</p>
              <div className="flex items-center gap-4 text-slate-300">
                <CheckCircle2 className="w-6 h-6 text-[#0066CC]" />
                <span className="text-lg">Average setup time is under 10 minutes.</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="p-6 border border-slate-700 bg-slate-800/50 rounded-2xl">
                <div className="text-4xl font-black text-white mb-2">{stats.fulfillmentIncrease}</div>
                <div className="text-slate-400">Increase in order fulfillment speed</div>
              </div>
              <div className="p-6 border border-slate-700 bg-slate-800/50 rounded-2xl">
                <div className="text-4xl font-black text-white mb-2">{stats.accuracy}</div>
                <div className="text-slate-400">Inventory accuracy across all channels</div>
              </div>
              <div className="p-6 border border-slate-700 bg-slate-800/50 rounded-2xl">
                <div className="text-4xl font-black text-white mb-2">{stats.warehouses}</div>
                <div className="text-slate-400">Warehouses managed globally</div>
              </div>
              <div className="p-6 border border-slate-700 bg-slate-800/50 rounded-2xl">
                <div className="text-4xl font-black text-white mb-2">{stats.discrepancies}</div>
                <div className="text-slate-400">Data discrepancies with our syncing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Integrate into your stack</h2>
          <p className="text-lg text-slate-600 mb-12">StockSavvy connects seamlessly with the tools you already use.</p>
          <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
            {/* Placeholder Integration Badges */}
            {['Shopify', 'Amazon', 'QuickBooks', 'WooCommerce', 'Stripe', 'Salesforce', 'Xero', 'Slack'].map((integration) => (
              <div key={integration} className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-2 hover:border-[#0066CC] hover:bg-blue-50 transition-colors cursor-pointer">
                <Plug className="w-5 h-5 text-slate-400" />
                {integration}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-slate-50">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-slate-600">Choose the perfect plan for your business needs. No hidden fees.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {isLoading ? (
            <div className="col-span-3 text-center py-12 text-slate-500">Loading plans...</div>
          ) : plans.map((plan) => (
            <div key={plan.id} className={`rounded-3xl p-8 flex flex-col relative transition-shadow ${plan.isPopular ? 'bg-slate-900 border border-slate-800 shadow-2xl shadow-slate-900/50 transform md:-translate-y-4 text-white' : 'bg-white border border-slate-200 shadow-sm hover:shadow-xl text-slate-900'}`}>
              {plan.isPopular && (
                <div className="absolute top-0 right-8 transform -translate-y-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-teal-400 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Most Popular</span>
                </div>
              )}
              <h3 className={`text-2xl font-bold mb-2 ${plan.isPopular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
              <p className={`mb-6 ${plan.isPopular ? 'text-slate-400' : 'text-slate-500'}`}>{plan.description}</p>
              
              <div className="mb-8">
                {plan.price !== null ? (
                  <>
                    <span className={`text-5xl font-extrabold ${plan.isPopular ? 'text-white' : 'text-slate-900'}`}>${plan.price}</span>
                    <span className={`font-medium ${plan.isPopular ? 'text-slate-400' : 'text-slate-500'}`}>/month</span>
                  </>
                ) : (
                  <span className={`text-5xl font-extrabold ${plan.isPopular ? 'text-white' : 'text-slate-900'}`}>Custom</span>
                )}
              </div>
              
              <button 
                onClick={() => navigate('/login')}
                className={`w-full py-3 px-6 rounded-xl font-bold transition-colors mb-8 ${plan.isPopular ? 'text-white bg-[#0066CC] hover:bg-[#0052a3] shadow-lg shadow-[#0066CC]/30' : (plan.price === null ? 'text-slate-700 bg-slate-100 hover:bg-slate-200' : 'text-[#0066CC] bg-blue-50 hover:bg-blue-100')}`}
              >
                {plan.price === null ? 'Contact Sales' : (plan.isPopular ? 'Get Started Now' : 'Start Free Trial')}
              </button>
              
              <div className="space-y-4 flex-1">
                {plan.features.map((feature: string, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className={`w-5 h-5 shrink-0 ${plan.isPopular ? 'text-teal-400' : 'text-blue-500'}`} />
                    <span className={`font-medium ${plan.isPopular ? 'text-slate-300' : 'text-slate-600'}`}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Got questions? We've got answers.</h2>
            <p className="text-xl text-slate-600">Find out more about how StockSavvy works.</p>
          </div>
          
          <div className="border-t border-slate-200">
            <FAQItem 
              question="What happens if I exceed my plan limits?" 
              answer="If you exceed your plan's SKU or user limits, your service will not be interrupted immediately. We will notify you and give you a 7-day grace period to upgrade to a higher tier." 
            />
            <FAQItem 
              question="Do you offer custom integrations for Enterprise?" 
              answer="Yes, our Enterprise tier includes dedicated engineering support to build custom connectors for your proprietary ERP or specialized sales channels." 
            />
            <FAQItem 
              question="Can I cancel my subscription at any time?" 
              answer="Absolutely. There are no long-term contracts for our Starter and Pro plans. You can cancel at any time directly from your dashboard billing page." 
            />
            <FAQItem 
              question="Is my data secure?" 
              answer="We use bank-level encryption (AES-256) for all data at rest and in transit. Role-based access controls ensure your staff only sees what they need to." 
            />
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto bg-[#0066CC] rounded-3xl p-12 text-center text-white shadow-2xl shadow-[#0066CC]/20">
          <h2 className="text-4xl font-bold mb-6">Ready to level up your inventory process?</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">Join thousands of businesses managing everything inside StockSavvy. Try it free for 14 days, no credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/login')} className="bg-white text-[#0066CC] hover:bg-slate-50 px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-white/10">
              Get Started Now
            </button>
            <button 
              onClick={() => setIsDemoModalOpen(true)}
              className="bg-[#0052a3] text-white hover:bg-[#004080] border border-[#004080] px-8 py-4 rounded-xl font-bold text-lg transition-colors"
            >
              Talk to Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
             <img src="/stocksavvy_logo.png" alt="StockSavvy Logo" className="w-8 h-8 shrink-0 object-contain" />
            <span className="font-black text-xl text-slate-900 tracking-tight">StockSavvy</span>
          </div>
          <p className="text-slate-500 font-medium">© {new Date().getFullYear()} StockSavvy. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-blue-600">Privacy Policy</a>
            <a href="#" className="text-slate-400 hover:text-blue-600">Terms of Service</a>
          </div>
        </div>
      </footer>

      <DemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </div>
  );
}
