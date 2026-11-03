export const specs = [
 {id:'kr-passport',ko:'대한민국 여권',en:'Korean passport',w:35,h:45,head:[32,36],white:true,passport:true,restricted:true,months:6,background:'uniform white',headMeasurement:'skull crown excluding hair to chin',digital:[413,531],acceptedPixels:[[395,431],[507,550]],maxBytes:500000,crownOffset:4,source:'https://www.passport.go.kr/home/kor/contents.do?menuPos=32',onlineSource:'https://www.passport.go.kr/home/kor/contents.do?menuPos=12'},
 {id:'id-card',ko:'주민등록증',en:'Korean ID card',w:35,h:45,background:'white recommended; light single colour acceptable',hatless:true,upperBody:true,restricted:true,months:6,source:'https://www.mois.go.kr/frt/sub/a06/b06/IDCard_5/screen.do'},
 {id:'driver-license',ko:'운전면허증',en:'Korean driving licence',w:35,h:45,head:[32,36],headRecommended:true,hatless:true,background:'no background; passport-style colour photo',white:true,restricted:true,months:6,source:'https://www.safedriving.or.kr/guide/larGuide10.do?menuCode=MN-PO-12111'},
 {id:'half-business',ko:'반명함',en:'Half-business portrait',w:30,h:40,convention:true,source:'./half-business/'},
 {id:'resume',ko:'이력서',en:'Résumé photo',w:30,h:40,convention:true,source:'./resume/'},
 {id:'us-passport',ko:'미국 여권',en:'US passport',w:50.8,h:50.8,head:[25.4,34.925],headMeasurement:'chin to top of head',background:'white or off-white',passport:true,restricted:true,source:'https://travel.state.gov/en/passports/apply/help/photos.html'},
 {id:'japan-passport',ko:'일본 여권',en:'Japanese passport',w:35,h:45,head:[32,36],crownOffset:4,topMargin:[2,6],sideMargin:2,borderless:true,background:'plain; white recommended',passport:true,source:'https://www.mofa.go.jp/mofaj/toko/passport/pass_2.html'},
 {id:'china-visa',ko:'중국 비자',en:'Chinese visa',w:33,h:48,head:[28,33],headWidth:[15,22],crownOffset:4,topMargin:[3,5],chinMargin:7,background:'white or near-white',white:true,restricted:true,source:'https://ch.china-embassy.gov.cn/fra/ls_fw_s_2/sbqz/201612/t20161207_3422419.htm'},
 {id:'schengen-visa',ko:'솅겐 비자',en:'Schengen visa',w:35,h:45,head:[32,36],background:'light plain',checkEmbassy:true,source:'https://www.france-visas.gouv.fr/documents/d/france-visas/iso_iec_fv_visa_photograph_requirements_en'}
];
export const pixels = mm => Math.round(mm / 25.4 * 300);
export const outputSize = s => s.digital || [pixels(s.w),pixels(s.h)];
export function editingWarning(s,en=false) {
 const rules = {
 'kr-passport': ['외교부: “AI를 활용한 편집·가공·합성” 및 배경 제거·흰 배경 합성 사진은 사용할 수 없습니다. 과도한 보정도 지양하세요.', 'Korean MOFA prohibits AI editing/compositing and removing or replacing the background; excessive retouching is discouraged.'],
 'id-card': ['행정안전부: “보정한 사진이나 이미지 사진은 사용할 수 없음” (주민등록법 시행규칙 제9조).', 'MOIS: retouched or image photos cannot be used (Resident Registration Act Enforcement Rule, Article 9).'],
 'driver-license': ['한국도로교통공단은 6개월 이내의 모자 없는 무배경 여권용 컬러사진을 요구합니다. 배경 제거·합성이나 보정 사진의 접수를 보장하지 않으므로 사용하지 마세요.', 'The licensing authority requires a recent hatless passport-style colour photo with no background. Do not use background removal, compositing or retouching; acceptance of edited photos is not assured.'],
 'us-passport': ['미 국무부: 필터, 편집, 보정, 배경 교체 및 AI 사용은 허용되지 않습니다.', 'US State Department: no filters, editing, retouching, background replacement or AI.'],
 'china-visa': ['중국 대사관: 사진 수정 및 합성은 허용되지 않습니다.', 'Chinese embassy: photo modification and compositing are not allowed.']
 };
 if(!rules[s.id])return '';
 return rules[s.id][en?1:0]+(en?' Photograph against a real white wall. Use this tool only for crop, size and print with background replacement OFF, retouch 0 and lighting/brightness/contrast adjustments off. Acceptance is not guaranteed.':' 실제 흰 벽 앞에서 촬영하고, 배경 정리 OFF·보정 0·조명/밝기/대비 조절 끄기로 자르기·크기·인화만 사용하세요. 접수는 보장되지 않습니다.');
}
