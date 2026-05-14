import re

with open('public/index.html', 'r') as f:
    content = f.read()

# Add type field to the form
form_type_html = '''                            <div>
                                <label class="block text-xs font-medium text-gray-700">Type</label>
                                <select x-model="costingForm.type" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-700">Frequency</label>'''
content = content.replace(
    '''                            <div>
                                <label class="block text-xs font-medium text-gray-700">Frequency</label>''',
    form_type_html
)

# Update costingForm initialization
content = content.replace(
    "costingForm: { description: '', amount: '', is_paid: false, frequency: 'one time' },",
    "costingForm: { description: '', amount: '', type: 'expense', is_paid: false, frequency: 'one time' },"
)
content = content.replace(
    "this.costingForm = { description: '', amount: '', is_paid: false, frequency: 'one time', created_at: today };",
    "this.costingForm = { description: '', amount: '', type: 'expense', is_paid: false, frequency: 'one time', created_at: today };"
)

# Render income as green, expense as red in the list
list_html_old = '''                                            <span x-text="formatCurrency(costing.amount) + ' (' + costing.frequency + ')'"></span>'''
list_html_new = '''                                            <span x-text="formatCurrency(costing.amount) + ' (' + costing.frequency + ')'" :class="costing.type === 'income' ? 'text-green-600' : 'text-red-600'"></span>'''
content = content.replace(list_html_old, list_html_new)

# Render type badge next to is_paid
badge_old = '''<span x-show="costing.is_paid" class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Paid</span>'''
badge_new = '''<span x-show="costing.is_paid" class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Paid</span>
               <span x-show="costing.type === 'income'" class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Income</span>
               <span x-show="costing.type === 'expense'" class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Expense</span>'''
content = content.replace(badge_old, badge_new)


with open('public/index.html', 'w') as f:
    f.write(content)
