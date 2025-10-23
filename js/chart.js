// chart.js — builds charts with Chart.js using synthetic data
async function loadStats(){
  const ctx = document.getElementById('flowChart').getContext('2d');
  const labels = Array.from({length:24}, (_,i)=>`${i}:00`);
  const data = {
    labels,
    datasets: [{
      label: 'Trafik axını (arbitrary)',
      data: labels.map((_,i)=> Math.round(20 + 60*Math.abs(Math.sin(i/3)) + Math.random()*20)),
      borderColor:'#0b3d91', backgroundColor:'rgba(11,61,145,0.12)', tension:0.3, fill:true
    }]
  };
  new Chart(ctx, {type:'line', data, options:{responsive:true, plugins:{legend:{display:false}}}});

  const ctx2 = document.getElementById('servicesChart').getContext('2d');
  const sLabels = ['Nərimanov','Xətai','Sahil'];
  const sData = [12,9,21];
  new Chart(ctx2, {type:'bar', data:{labels:sLabels, datasets:[{label:'Rezervasiyalar', data:sData, backgroundColor:['#0ea5a4','#ffb020','#e02424']}]}, options:{plugins:{legend:{display:false}}}});
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (document.getElementById('trafficChart')){
    // build small traffic chart
    const ctx = document.getElementById('trafficChart').getContext('2d');
    new Chart(ctx, {type:'doughnut', data:{labels:['Low','Medium','High'], datasets:[{data:[50,30,20], backgroundColor:['#22c55e','#ffb020','#e02424']}]}, options:{plugins:{legend:{position:'bottom'}}}});
  }
});
